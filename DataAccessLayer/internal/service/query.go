// Package service — DAL business logic for query and write operations.
package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"go.uber.org/zap"

	"github.com/tarotfriend/data-access-layer/internal/cache"
	"github.com/tarotfriend/data-access-layer/internal/storage"
	dalv1 "github.com/tarotfriend/data-access-layer/pkg/proto/dal/v1"
)

// QueryService handles read operations against PostgreSQL with optional caching.
type QueryService struct {
	router *storage.Router
	cache  *cache.Manager
	logger *zap.Logger
}

// NewQueryService creates a new QueryService.
func NewQueryService(router *storage.Router, cacheManager *cache.Manager, logger *zap.Logger) *QueryService {
	return &QueryService{router: router, cache: cacheManager, logger: logger}
}

// QueryResult holds the result of a query operation.
type QueryResult struct {
	Records   [][]byte
	Total     int64
	FromCache bool
}

// Execute runs a query with cache policy support.
func (qs *QueryService) Execute(ctx context.Context, service, entity string, filters map[string]string, limit, offset int32, orderBy string, cachePolicy dalv1.CachePolicy) (*QueryResult, error) {
	// Check cache first if policy allows
	if qs.cache != nil && cachePolicy == dalv1.CachePolicy_CACHE_POLICY_CACHE_FIRST {
		cached, err := qs.cache.GetList(ctx, service, entity, filters)
		if err != nil {
			qs.logger.Warn("cache read failed, falling back to DB", zap.Error(err))
		} else if cached != nil {
			return &QueryResult{
				Records:   cached,
				Total:     int64(len(cached)),
				FromCache: true,
			}, nil
		}
	}

	// Cache-only mode: don't hit DB
	if cachePolicy == dalv1.CachePolicy_CACHE_POLICY_CACHE_ONLY {
		return &QueryResult{FromCache: true}, nil
	}

	// Query from DB
	result, err := qs.queryDB(ctx, service, entity, filters, limit, offset, orderBy)
	if err != nil {
		return nil, err
	}

	// Populate cache after DB read (read-through)
	if qs.cache != nil && cachePolicy != dalv1.CachePolicy_CACHE_POLICY_NO_CACHE && len(result.Records) > 0 {
		if err := qs.cache.SetList(ctx, service, entity, filters, result.Records); err != nil {
			qs.logger.Warn("cache write failed", zap.Error(err))
		}
	}

	return result, nil
}

func (qs *QueryService) queryDB(ctx context.Context, service, entity string, filters map[string]string, limit, offset int32, orderBy string) (*QueryResult, error) {
	route, err := qs.router.Route(service, entity)
	if err != nil {
		return nil, fmt.Errorf("routing: %w", err)
	}

	countSQL, countArgs, err := storage.BuildCount(route.TableName, filters)
	if err != nil {
		return nil, fmt.Errorf("building count: %w", err)
	}

	selectSQL, selectArgs, err := storage.BuildSelect(route.TableName, filters, limit, offset, orderBy)
	if err != nil {
		return nil, fmt.Errorf("building select: %w", err)
	}

	qs.logger.Debug("executing query",
		zap.String("service", service),
		zap.String("entity", entity),
		zap.String("sql", selectSQL),
	)

	var total int64
	if err := route.Pool.QueryRow(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, fmt.Errorf("counting: %w", err)
	}

	rows, err := route.Pool.Query(ctx, selectSQL, selectArgs...)
	if err != nil {
		return nil, fmt.Errorf("querying: %w", err)
	}
	defer rows.Close()

	var records [][]byte
	for rows.Next() {
		row, err := rowToJSON(rows)
		if err != nil {
			return nil, fmt.Errorf("scanning row: %w", err)
		}
		records = append(records, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating rows: %w", err)
	}

	return &QueryResult{
		Records:   records,
		Total:     total,
		FromCache: false,
	}, nil
}

// rowToJSON scans a pgx row into a map and marshals it to JSON.
func rowToJSON(rows pgx.Rows) ([]byte, error) {
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
