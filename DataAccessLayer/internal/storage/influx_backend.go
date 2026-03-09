package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api"
	"go.uber.org/zap"
)

// InfluxBackend implements StorageBackend for InfluxDB v2.
type InfluxBackend struct {
	client   influxdb2.Client
	writeAPI api.WriteAPIBlocking
	queryAPI api.QueryAPI
	org      string
	bucket   string
	logger   *zap.Logger
}

// NewInfluxBackend connects to InfluxDB and returns a backend.
func NewInfluxBackend(ctx context.Context, url, token, org, bucket string, logger *zap.Logger) (*InfluxBackend, error) {
	client := influxdb2.NewClient(url, token)

	// Verify connectivity
	health, err := client.Health(ctx)
	if err != nil {
		return nil, fmt.Errorf("checking InfluxDB health: %w", err)
	}
	if health.Status != "pass" {
		return nil, fmt.Errorf("InfluxDB unhealthy: %s", health.Status)
	}

	backend := &InfluxBackend{
		client:   client,
		writeAPI: client.WriteAPIBlocking(org, bucket),
		queryAPI: client.QueryAPI(org),
		org:      org,
		bucket:   bucket,
		logger:   logger,
	}

	logger.Info("InfluxDB backend initialized",
		zap.String("url", url),
		zap.String("org", org),
		zap.String("bucket", bucket),
	)

	return backend, nil
}

func (b *InfluxBackend) Engine() EngineType {
	return EngineInflux
}

func (b *InfluxBackend) QueryRecords(ctx context.Context, target string, filters map[string]string, limit, offset int32, orderBy string) ([][]byte, int64, error) {
	// Build Flux query
	// target = measurement name
	flux := fmt.Sprintf(`from(bucket: "%s")`, b.bucket)

	// Default to last 30 days if no time range specified
	timeRange := "-30d"
	if v, ok := filters["_range"]; ok {
		timeRange = v
		delete(filters, "_range")
	}
	flux += fmt.Sprintf(` |> range(start: %s)`, timeRange)

	// Filter by measurement
	flux += fmt.Sprintf(` |> filter(fn: (r) => r._measurement == "%s")`, target)

	// Add tag/field filters
	for k, v := range filters {
		if k[0] == '_' {
			continue // skip internal keys
		}
		flux += fmt.Sprintf(` |> filter(fn: (r) => r["%s"] == "%s")`, k, v)
	}

	// Pivot to get fields as columns
	flux += ` |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")`

	// Sort
	if orderBy != "" {
		col := orderBy
		desc := "false"
		if len(orderBy) > 5 && orderBy[len(orderBy)-5:] == ":desc" {
			desc = "true"
			col = orderBy[:len(orderBy)-5]
		} else if len(orderBy) > 4 && orderBy[len(orderBy)-4:] == ":asc" {
			col = orderBy[:len(orderBy)-4]
		}
		flux += fmt.Sprintf(` |> sort(columns: ["%s"], desc: %s)`, col, desc)
	} else {
		flux += ` |> sort(columns: ["_time"], desc: true)`
	}

	// Pagination
	if offset > 0 {
		flux += fmt.Sprintf(` |> tail(n: %d)`, int(offset))
	}
	if limit > 0 {
		flux += fmt.Sprintf(` |> limit(n: %d)`, int(limit))
	}

	b.logger.Debug("influx query", zap.String("flux", flux))

	result, err := b.queryAPI.Query(ctx, flux)
	if err != nil {
		return nil, 0, fmt.Errorf("querying InfluxDB: %w", err)
	}

	var records [][]byte
	for result.Next() {
		record := result.Record()

		// Build a JSON-friendly map from the record
		m := map[string]interface{}{
			"_time":        record.Time().Format(time.RFC3339),
			"_measurement": target,
		}

		// Add all values from the record
		for k, v := range record.Values() {
			if k == "_start" || k == "_stop" || k == "result" || k == "table" {
				continue // skip InfluxDB internal fields
			}
			m[k] = v
		}

		jsonBytes, err := json.Marshal(m)
		if err != nil {
			return nil, 0, fmt.Errorf("marshaling record: %w", err)
		}
		records = append(records, jsonBytes)
	}

	if err := result.Err(); err != nil {
		return nil, 0, fmt.Errorf("result error: %w", err)
	}

	return records, int64(len(records)), nil
}

func (b *InfluxBackend) WriteRecord(ctx context.Context, target string, operation string, payload []byte) (string, error) {
	switch operation {
	case "create":
		return b.writePoint(ctx, target, payload)
	case "delete":
		// InfluxDB delete via API uses time range + predicate
		return b.deletePoint(ctx, target, payload)
	case "update":
		// InfluxDB doesn't support updates; overwrite by writing same timestamp
		return b.writePoint(ctx, target, payload)
	default:
		return "", fmt.Errorf("unknown operation %q", operation)
	}
}

func (b *InfluxBackend) writePoint(ctx context.Context, measurement string, payload []byte) (string, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	// Extract tags vs fields
	// Convention: keys starting with "_tag_" are tags, rest are fields
	tags := make(map[string]string)
	fields := make(map[string]interface{})

	var ts time.Time
	for k, v := range data {
		switch {
		case k == "_time" || k == "timestamp":
			switch tv := v.(type) {
			case string:
				parsed, err := time.Parse(time.RFC3339, tv)
				if err == nil {
					ts = parsed
				}
			case float64:
				ts = time.Unix(int64(tv), 0)
			}
		case k == "_measurement":
			continue
		case len(k) > 5 && k[:5] == "_tag_":
			tags[k[5:]] = fmt.Sprintf("%v", v)
		default:
			// Common tag keys (known from schema)
			switch k {
			case "customer_id", "service", "source", "currency":
				tags[k] = fmt.Sprintf("%v", v)
			default:
				fields[k] = v
			}
		}
	}

	if ts.IsZero() {
		ts = time.Now()
	}

	if len(fields) == 0 {
		return "", fmt.Errorf("no field values in payload for measurement %s", measurement)
	}

	point := influxdb2.NewPoint(measurement, tags, fields, ts)
	if err := b.writeAPI.WritePoint(ctx, point); err != nil {
		return "", fmt.Errorf("writing to InfluxDB: %w", err)
	}

	// Return a synthetic ID based on timestamp
	return fmt.Sprintf("%s:%d", measurement, ts.UnixNano()), nil
}

func (b *InfluxBackend) deletePoint(ctx context.Context, measurement string, payload []byte) (string, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	// Build predicate for deletion
	predicate := fmt.Sprintf(`_measurement="%s"`, measurement)
	if cid, ok := data["customer_id"]; ok {
		predicate += fmt.Sprintf(` AND customer_id="%v"`, cid)
	}

	start := time.Unix(0, 0)
	stop := time.Now()

	deleteAPI := b.client.DeleteAPI()
	if err := deleteAPI.DeleteWithName(ctx, b.org, b.bucket, start, stop, predicate); err != nil {
		return "", fmt.Errorf("deleting from InfluxDB: %w", err)
	}

	id, _ := data["id"].(string)
	return id, nil
}

func (b *InfluxBackend) Ping(ctx context.Context) error {
	health, err := b.client.Health(ctx)
	if err != nil {
		return err
	}
	if health.Status != "pass" {
		return fmt.Errorf("InfluxDB status: %s", health.Status)
	}
	return nil
}

func (b *InfluxBackend) Close() {
	b.client.Close()
}
