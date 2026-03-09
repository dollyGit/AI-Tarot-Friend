package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	pb "github.com/qdrant/go-client/qdrant"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// QdrantBackend implements StorageBackend for Qdrant vector database.
type QdrantBackend struct {
	conn        *grpc.ClientConn
	points      pb.PointsClient
	collections pb.CollectionsClient
	logger      *zap.Logger
}

// QdrantCollectionConfig defines a vector collection's configuration.
type QdrantCollectionConfig struct {
	Name     string
	VectorSize uint64
	Distance   pb.Distance
}

// DefaultCollections returns the standard vector collections for TarotFriend.
func DefaultCollections() []QdrantCollectionConfig {
	return []QdrantCollectionConfig{
		{Name: "conversation-summaries", VectorSize: 1536, Distance: pb.Distance_Cosine},
		{Name: "long-term-memory", VectorSize: 1536, Distance: pb.Distance_Cosine},
	}
}

// NewQdrantBackend connects to Qdrant and returns a backend.
func NewQdrantBackend(ctx context.Context, addr string, logger *zap.Logger) (*QdrantBackend, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("connecting to Qdrant at %s: %w", addr, err)
	}

	backend := &QdrantBackend{
		conn:        conn,
		points:      pb.NewPointsClient(conn),
		collections: pb.NewCollectionsClient(conn),
		logger:      logger,
	}

	// Ensure collections exist
	for _, cfg := range DefaultCollections() {
		if err := backend.ensureCollection(ctx, cfg); err != nil {
			logger.Warn("failed to ensure Qdrant collection",
				zap.String("collection", cfg.Name),
				zap.Error(err),
			)
		}
	}

	logger.Info("Qdrant backend initialized", zap.String("addr", addr))
	return backend, nil
}

func (b *QdrantBackend) Engine() EngineType {
	return EngineQdrant
}

func (b *QdrantBackend) QueryRecords(ctx context.Context, target string, filters map[string]string, limit, offset int32, orderBy string) ([][]byte, int64, error) {
	// Check for vector search mode (special _vector filter key)
	vectorJSON, hasVector := filters["_vector"]
	if hasVector {
		return b.vectorSearch(ctx, target, vectorJSON, filters, limit)
	}

	// Fallback: scroll through all points with optional filters
	return b.scrollPoints(ctx, target, filters, limit, offset)
}

func (b *QdrantBackend) vectorSearch(ctx context.Context, collection, vectorJSON string, filters map[string]string, limit int32) ([][]byte, int64, error) {
	// Parse the query vector
	var queryVector []float32
	if err := json.Unmarshal([]byte(vectorJSON), &queryVector); err != nil {
		return nil, 0, fmt.Errorf("invalid _vector JSON: %w", err)
	}

	if limit <= 0 {
		limit = 10
	}

	// Parse score threshold
	var scoreThreshold float32
	if v, ok := filters["_threshold"]; ok {
		if f, err := strconv.ParseFloat(v, 32); err == nil {
			scoreThreshold = float32(f)
		}
	}

	// Build payload filter (exclude special keys)
	var qdrantFilter *pb.Filter
	conditions := make([]*pb.Condition, 0)
	for k, v := range filters {
		if k[0] == '_' {
			continue // skip _vector, _threshold, _limit, etc.
		}
		conditions = append(conditions, &pb.Condition{
			ConditionOneOf: &pb.Condition_Field{
				Field: &pb.FieldCondition{
					Key: k,
					Match: &pb.Match{
						MatchValue: &pb.Match_Keyword{Keyword: v},
					},
				},
			},
		})
	}
	if len(conditions) > 0 {
		qdrantFilter = &pb.Filter{Must: conditions}
	}

	req := &pb.SearchPoints{
		CollectionName: collection,
		Vector:         queryVector,
		Limit:          uint64(limit),
		Filter:         qdrantFilter,
		WithPayload:    &pb.WithPayloadSelector{SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true}},
		ScoreThreshold: &scoreThreshold,
	}

	resp, err := b.points.Search(ctx, req)
	if err != nil {
		return nil, 0, fmt.Errorf("vector search in %s: %w", collection, err)
	}

	var records [][]byte
	for _, scored := range resp.Result {
		record := map[string]interface{}{
			"id":    pointIDToString(scored.Id),
			"score": scored.Score,
		}

		// Add payload fields
		for k, v := range scored.Payload {
			record[k] = qdrantValueToInterface(v)
		}

		jsonBytes, err := json.Marshal(record)
		if err != nil {
			return nil, 0, fmt.Errorf("marshaling result: %w", err)
		}
		records = append(records, jsonBytes)
	}

	return records, int64(len(records)), nil
}

func (b *QdrantBackend) scrollPoints(ctx context.Context, collection string, filters map[string]string, limit, offset int32) ([][]byte, int64, error) {
	if limit <= 0 {
		limit = 100
	}

	// Build filter
	conditions := make([]*pb.Condition, 0)
	for k, v := range filters {
		if k[0] == '_' {
			continue
		}
		conditions = append(conditions, &pb.Condition{
			ConditionOneOf: &pb.Condition_Field{
				Field: &pb.FieldCondition{
					Key: k,
					Match: &pb.Match{
						MatchValue: &pb.Match_Keyword{Keyword: v},
					},
				},
			},
		})
	}

	var qdrantFilter *pb.Filter
	if len(conditions) > 0 {
		qdrantFilter = &pb.Filter{Must: conditions}
	}

	scrollLimit := uint32(limit)
	req := &pb.ScrollPoints{
		CollectionName: collection,
		Filter:         qdrantFilter,
		Limit:          &scrollLimit,
		WithPayload:    &pb.WithPayloadSelector{SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true}},
		WithVectors:    &pb.WithVectorsSelector{SelectorOptions: &pb.WithVectorsSelector_Enable{Enable: false}},
	}

	resp, err := b.points.Scroll(ctx, req)
	if err != nil {
		return nil, 0, fmt.Errorf("scrolling %s: %w", collection, err)
	}

	var records [][]byte
	for _, point := range resp.Result {
		record := map[string]interface{}{
			"id": pointIDToString(point.Id),
		}
		for k, v := range point.Payload {
			record[k] = qdrantValueToInterface(v)
		}
		jsonBytes, err := json.Marshal(record)
		if err != nil {
			return nil, 0, fmt.Errorf("marshaling point: %w", err)
		}
		records = append(records, jsonBytes)
	}

	return records, int64(len(records)), nil
}

func (b *QdrantBackend) WriteRecord(ctx context.Context, target string, operation string, payload []byte) (string, error) {
	switch operation {
	case "create", "update":
		return b.upsertPoint(ctx, target, payload)
	case "delete":
		return b.deletePoint(ctx, target, payload)
	default:
		return "", fmt.Errorf("unknown operation %q", operation)
	}
}

func (b *QdrantBackend) upsertPoint(ctx context.Context, collection string, payload []byte) (string, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	// Extract ID
	idStr, _ := data["id"].(string)
	if idStr == "" {
		return "", fmt.Errorf("id is required for upsert")
	}

	// Extract vector
	vectorRaw, ok := data["_vector"]
	if !ok {
		return "", fmt.Errorf("_vector field is required for upsert")
	}

	vectorBytes, err := json.Marshal(vectorRaw)
	if err != nil {
		return "", fmt.Errorf("marshaling vector: %w", err)
	}
	var vector []float32
	if err := json.Unmarshal(vectorBytes, &vector); err != nil {
		return "", fmt.Errorf("parsing vector: %w", err)
	}

	// Build payload (everything except id and _vector)
	qdrantPayload := make(map[string]*pb.Value)
	for k, v := range data {
		if k == "id" || k == "_vector" {
			continue
		}
		qdrantPayload[k] = interfaceToQdrantValue(v)
	}

	point := &pb.PointStruct{
		Id:      &pb.PointId{PointIdOptions: &pb.PointId_Uuid{Uuid: idStr}},
		Vectors: &pb.Vectors{VectorsOptions: &pb.Vectors_Vector{Vector: &pb.Vector{Data: vector}}},
		Payload: qdrantPayload,
	}

	wait := true
	_, err = b.points.Upsert(ctx, &pb.UpsertPoints{
		CollectionName: collection,
		Wait:           &wait,
		Points:         []*pb.PointStruct{point},
	})
	if err != nil {
		return "", fmt.Errorf("upserting into %s: %w", collection, err)
	}

	return idStr, nil
}

func (b *QdrantBackend) deletePoint(ctx context.Context, collection string, payload []byte) (string, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	idStr, _ := data["id"].(string)
	if idStr == "" {
		return "", fmt.Errorf("id is required for delete")
	}

	wait := true
	_, err := b.points.Delete(ctx, &pb.DeletePoints{
		CollectionName: collection,
		Wait:           &wait,
		Points: &pb.PointsSelector{
			PointsSelectorOneOf: &pb.PointsSelector_Points{
				Points: &pb.PointsIdsList{
					Ids: []*pb.PointId{
						{PointIdOptions: &pb.PointId_Uuid{Uuid: idStr}},
					},
				},
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("deleting from %s: %w", collection, err)
	}

	return idStr, nil
}

func (b *QdrantBackend) Ping(ctx context.Context) error {
	_, err := b.collections.List(ctx, &pb.ListCollectionsRequest{})
	return err
}

func (b *QdrantBackend) Close() {
	b.conn.Close()
}

func (b *QdrantBackend) ensureCollection(ctx context.Context, cfg QdrantCollectionConfig) error {
	// Check if collection exists
	resp, err := b.collections.List(ctx, &pb.ListCollectionsRequest{})
	if err != nil {
		return err
	}
	for _, c := range resp.Collections {
		if c.Name == cfg.Name {
			return nil // already exists
		}
	}

	// Create collection
	_, err = b.collections.Create(ctx, &pb.CreateCollection{
		CollectionName: cfg.Name,
		VectorsConfig: &pb.VectorsConfig{
			Config: &pb.VectorsConfig_Params{
				Params: &pb.VectorParams{
					Size:     cfg.VectorSize,
					Distance: cfg.Distance,
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("creating collection %s: %w", cfg.Name, err)
	}

	b.logger.Info("created Qdrant collection",
		zap.String("collection", cfg.Name),
		zap.Uint64("vector_size", cfg.VectorSize),
	)

	return nil
}

// ── Helpers ────────────────────────────────────────────────

func pointIDToString(id *pb.PointId) string {
	if id == nil {
		return ""
	}
	switch v := id.PointIdOptions.(type) {
	case *pb.PointId_Uuid:
		return v.Uuid
	case *pb.PointId_Num:
		return strconv.FormatUint(v.Num, 10)
	default:
		return ""
	}
}

func qdrantValueToInterface(v *pb.Value) interface{} {
	if v == nil {
		return nil
	}
	switch val := v.Kind.(type) {
	case *pb.Value_StringValue:
		return val.StringValue
	case *pb.Value_IntegerValue:
		return val.IntegerValue
	case *pb.Value_DoubleValue:
		return val.DoubleValue
	case *pb.Value_BoolValue:
		return val.BoolValue
	case *pb.Value_NullValue:
		return nil
	case *pb.Value_ListValue:
		result := make([]interface{}, len(val.ListValue.Values))
		for i, item := range val.ListValue.Values {
			result[i] = qdrantValueToInterface(item)
		}
		return result
	case *pb.Value_StructValue:
		result := make(map[string]interface{})
		for k, item := range val.StructValue.Fields {
			result[k] = qdrantValueToInterface(item)
		}
		return result
	default:
		return nil
	}
}

func interfaceToQdrantValue(v interface{}) *pb.Value {
	switch val := v.(type) {
	case string:
		return &pb.Value{Kind: &pb.Value_StringValue{StringValue: val}}
	case float64:
		return &pb.Value{Kind: &pb.Value_DoubleValue{DoubleValue: val}}
	case float32:
		return &pb.Value{Kind: &pb.Value_DoubleValue{DoubleValue: float64(val)}}
	case int:
		return &pb.Value{Kind: &pb.Value_IntegerValue{IntegerValue: int64(val)}}
	case int64:
		return &pb.Value{Kind: &pb.Value_IntegerValue{IntegerValue: val}}
	case bool:
		return &pb.Value{Kind: &pb.Value_BoolValue{BoolValue: val}}
	case nil:
		return &pb.Value{Kind: &pb.Value_NullValue{}}
	default:
		// Fallback: marshal to JSON string
		b, _ := json.Marshal(val)
		return &pb.Value{Kind: &pb.Value_StringValue{StringValue: string(b)}}
	}
}
