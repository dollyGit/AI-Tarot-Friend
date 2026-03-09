package service

import (
	"context"
	"encoding/json"
	"fmt"

	"go.uber.org/zap"

	"github.com/tarotfriend/data-access-layer/internal/cache"
	"github.com/tarotfriend/data-access-layer/internal/storage"
)

// WriteService handles create/update/delete operations against PostgreSQL
// with cache integration (write-through, write-behind, invalidation).
type WriteService struct {
	router *storage.Router
	cache  *cache.Manager
	logger *zap.Logger
}

// NewWriteService creates a new WriteService.
func NewWriteService(router *storage.Router, cacheManager *cache.Manager, logger *zap.Logger) *WriteService {
	return &WriteService{router: router, cache: cacheManager, logger: logger}
}

// WriteResult holds the result of a write operation.
type WriteResult struct {
	ID      string
	Success bool
	Error   string
}

// Execute runs a write operation (create/update/delete) with cache coordination.
func (ws *WriteService) Execute(ctx context.Context, service, entity, operation string, payload []byte) (*WriteResult, error) {
	route, err := ws.router.Route(service, entity)
	if err != nil {
		return nil, fmt.Errorf("routing: %w", err)
	}

	ws.logger.Debug("executing write",
		zap.String("service", service),
		zap.String("entity", entity),
		zap.String("operation", operation),
	)

	// Check cache strategy for this entity
	strategy := ""
	if ws.cache != nil {
		strategy = ws.cache.Strategy(entity)
	}

	// Write-behind: buffer the write, return immediately
	if strategy == "write_behind" {
		return ws.writeBehind(ctx, service, entity, operation, payload)
	}

	// Default: write to DB directly
	var result *WriteResult
	switch operation {
	case "create":
		result, err = ws.create(ctx, route, payload)
	case "update":
		result, err = ws.update(ctx, route, payload)
	case "delete":
		result, err = ws.delete(ctx, route, payload)
	default:
		return &WriteResult{
			Success: false,
			Error:   fmt.Sprintf("unknown operation %q", operation),
		}, nil
	}

	if err != nil {
		return nil, err
	}

	// On successful write, handle cache
	if result.Success && ws.cache != nil {
		switch strategy {
		case "write_through":
			// Sync write to cache + invalidate lists
			if operation == "create" || operation == "update" {
				if err := ws.cache.Set(ctx, service, entity, result.ID, payload); err != nil {
					ws.logger.Warn("write-through cache set failed", zap.Error(err))
				}
			}
			if err := ws.cache.Invalidate(ctx, service, entity, result.ID); err != nil {
				ws.logger.Warn("cache invalidation failed", zap.Error(err))
			}
		default:
			// read_through or unknown: just invalidate
			if err := ws.cache.Invalidate(ctx, service, entity, result.ID); err != nil {
				ws.logger.Warn("cache invalidation failed", zap.Error(err))
			}
		}
	}

	return result, nil
}

func (ws *WriteService) writeBehind(ctx context.Context, service, entity, operation string, payload []byte) (*WriteResult, error) {
	// Extract ID from payload for the response
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return &WriteResult{Success: false, Error: fmt.Sprintf("invalid payload: %v", err)}, nil
	}

	id, _ := data["id"].(string)

	// Get or create write-behind buffer
	buf := ws.cache.GetWriteBehindBuffer(entity, func(ctx context.Context, items []cache.WriteBehindItem) error {
		for _, item := range items {
			route, err := ws.router.Route(item.Service, item.Entity)
			if err != nil {
				ws.logger.Error("write-behind flush routing failed", zap.Error(err))
				continue
			}
			switch item.Operation {
			case "create":
				if _, err := ws.create(ctx, route, item.Payload); err != nil {
					ws.logger.Error("write-behind flush create failed", zap.Error(err))
				}
			case "update":
				if _, err := ws.update(ctx, route, item.Payload); err != nil {
					ws.logger.Error("write-behind flush update failed", zap.Error(err))
				}
			case "delete":
				if _, err := ws.delete(ctx, route, item.Payload); err != nil {
					ws.logger.Error("write-behind flush delete failed", zap.Error(err))
				}
			}
		}
		return nil
	})

	buf.Add(cache.WriteBehindItem{
		Service:   service,
		Entity:    entity,
		Operation: operation,
		ID:        id,
		Payload:   payload,
	})

	return &WriteResult{ID: id, Success: true}, nil
}

func (ws *WriteService) create(ctx context.Context, route *storage.RouteResult, payload []byte) (*WriteResult, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return &WriteResult{Success: false, Error: fmt.Sprintf("invalid payload: %v", err)}, nil
	}

	sql, args, err := storage.BuildInsert(route.TableName, data)
	if err != nil {
		return &WriteResult{Success: false, Error: err.Error()}, nil
	}

	var id string
	if err := route.Pool.QueryRow(ctx, sql, args...).Scan(&id); err != nil {
		return nil, fmt.Errorf("inserting into %s: %w", route.TableName, err)
	}

	return &WriteResult{ID: id, Success: true}, nil
}

func (ws *WriteService) update(ctx context.Context, route *storage.RouteResult, payload []byte) (*WriteResult, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return &WriteResult{Success: false, Error: fmt.Sprintf("invalid payload: %v", err)}, nil
	}

	id, ok := data["id"].(string)
	if !ok || id == "" {
		return &WriteResult{Success: false, Error: "id is required for update"}, nil
	}

	sql, args, err := storage.BuildUpdate(route.TableName, id, data)
	if err != nil {
		return &WriteResult{Success: false, Error: err.Error()}, nil
	}

	tag, err := route.Pool.Exec(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("updating %s: %w", route.TableName, err)
	}
	if tag.RowsAffected() == 0 {
		return &WriteResult{Success: false, Error: fmt.Sprintf("no rows found with id %q", id)}, nil
	}

	return &WriteResult{ID: id, Success: true}, nil
}

func (ws *WriteService) delete(ctx context.Context, route *storage.RouteResult, payload []byte) (*WriteResult, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return &WriteResult{Success: false, Error: fmt.Sprintf("invalid payload: %v", err)}, nil
	}

	id, ok := data["id"].(string)
	if !ok || id == "" {
		return &WriteResult{Success: false, Error: "id is required for delete"}, nil
	}

	sql, args := storage.BuildDelete(route.TableName, id)
	tag, err := route.Pool.Exec(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("deleting from %s: %w", route.TableName, err)
	}
	if tag.RowsAffected() == 0 {
		return &WriteResult{Success: false, Error: fmt.Sprintf("no rows found with id %q", id)}, nil
	}

	return &WriteResult{ID: id, Success: true}, nil
}
