package storage

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// PostgresBackend implements StorageBackend for PostgreSQL using pgxpool.
type PostgresBackend struct {
	pool   *pgxpool.Pool
	logger *zap.Logger
}

// NewPostgresBackend wraps an existing pgxpool.Pool.
func NewPostgresBackend(pool *pgxpool.Pool, logger *zap.Logger) *PostgresBackend {
	return &PostgresBackend{pool: pool, logger: logger}
}

func (b *PostgresBackend) Engine() EngineType {
	return EnginePostgres
}

func (b *PostgresBackend) QueryRecords(ctx context.Context, target string, filters map[string]string, limit, offset int32, orderBy string) ([][]byte, int64, error) {
	// Count
	countSQL, countArgs, err := BuildCount(target, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("building count: %w", err)
	}

	var total int64
	if err := b.pool.QueryRow(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting %s: %w", target, err)
	}

	// Select
	selectSQL, selectArgs, err := BuildSelect(target, filters, limit, offset, orderBy)
	if err != nil {
		return nil, 0, fmt.Errorf("building select: %w", err)
	}

	b.logger.Debug("postgres query",
		zap.String("table", target),
		zap.String("sql", selectSQL),
	)

	rows, err := b.pool.Query(ctx, selectSQL, selectArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("querying %s: %w", target, err)
	}
	defer rows.Close()

	var records [][]byte
	for rows.Next() {
		row, err := pgxRowToJSON(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning row: %w", err)
		}
		records = append(records, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating rows: %w", err)
	}

	return records, total, nil
}

func (b *PostgresBackend) WriteRecord(ctx context.Context, target string, operation string, payload []byte) (string, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	switch operation {
	case "create":
		return b.create(ctx, target, data)
	case "update":
		return b.update(ctx, target, data)
	case "delete":
		return b.deleteRecord(ctx, target, data)
	default:
		return "", fmt.Errorf("unknown operation %q", operation)
	}
}

func (b *PostgresBackend) create(ctx context.Context, table string, data map[string]interface{}) (string, error) {
	sql, args, err := BuildInsert(table, data)
	if err != nil {
		return "", fmt.Errorf("building insert: %w", err)
	}

	var id string
	if err := b.pool.QueryRow(ctx, sql, args...).Scan(&id); err != nil {
		return "", fmt.Errorf("inserting into %s: %w", table, err)
	}
	return id, nil
}

func (b *PostgresBackend) update(ctx context.Context, table string, data map[string]interface{}) (string, error) {
	id, ok := data["id"].(string)
	if !ok || id == "" {
		return "", fmt.Errorf("id is required for update")
	}

	sql, args, err := BuildUpdate(table, id, data)
	if err != nil {
		return "", fmt.Errorf("building update: %w", err)
	}

	tag, err := b.pool.Exec(ctx, sql, args...)
	if err != nil {
		return "", fmt.Errorf("updating %s: %w", table, err)
	}
	if tag.RowsAffected() == 0 {
		return "", fmt.Errorf("no rows found with id %q", id)
	}
	return id, nil
}

func (b *PostgresBackend) deleteRecord(ctx context.Context, table string, data map[string]interface{}) (string, error) {
	id, ok := data["id"].(string)
	if !ok || id == "" {
		return "", fmt.Errorf("id is required for delete")
	}

	sql, args := BuildDelete(table, id)
	tag, err := b.pool.Exec(ctx, sql, args...)
	if err != nil {
		return "", fmt.Errorf("deleting from %s: %w", table, err)
	}
	if tag.RowsAffected() == 0 {
		return "", fmt.Errorf("no rows found with id %q", id)
	}
	return id, nil
}

func (b *PostgresBackend) Ping(ctx context.Context) error {
	return b.pool.Ping(ctx)
}

func (b *PostgresBackend) Close() {
	b.pool.Close()
}

// Pool returns the underlying pgxpool.Pool for legacy access (PoolManager health checks).
func (b *PostgresBackend) Pool() *pgxpool.Pool {
	return b.pool
}

// pgxRowToJSON scans a pgx row into a map and marshals to JSON.
func pgxRowToJSON(rows pgx.Rows) ([]byte, error) {
	values, err := rows.Values()
	if err != nil {
		return nil, err
	}

	descs := rows.FieldDescriptions()
	m := make(map[string]interface{}, len(descs))
	for i, desc := range descs {
		m[string(desc.Name)] = values[i]
	}

	return json.Marshal(m)
}
