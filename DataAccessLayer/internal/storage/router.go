package storage

import (
	"fmt"
	"sync"

	"go.uber.org/zap"
)

// RouteResult is the resolved target for a service+entity pair.
type RouteResult struct {
	Backend    StorageBackend
	TargetName string     // table / collection / measurement / label
	Engine     EngineType // convenience accessor
}

// entityRoute defines where an entity is stored.
type entityRoute struct {
	engine EngineType
	target string // table / collection / measurement / label
}

// Router maps (service, entity) → (backend, target_name).
// PostgreSQL entities use the legacy entityTable map.
// Non-postgres entities use the engineEntities map.
type Router struct {
	pools          *PoolManager
	pgBackends     map[string]*PostgresBackend         // service → PostgresBackend
	backends       map[EngineType]StorageBackend        // engine → backend (non-postgres)
	entityTable    map[string]map[string]string         // service → entity → table_name (postgres)
	engineEntities map[string]map[string]entityRoute    // service → entity → {engine, target}
	logger         *zap.Logger
	mu             sync.RWMutex
}

// NewRouter creates a storage router with known entity→table mappings.
// By default all entities route to PostgreSQL. Call RegisterBackend +
// RegisterEntity to add non-postgres routes.
func NewRouter(pools *PoolManager, logger *zap.Logger) *Router {
	return &Router{
		pools:      pools,
		pgBackends: make(map[string]*PostgresBackend),
		backends:   make(map[EngineType]StorageBackend),
		logger:     logger,
		entityTable: map[string]map[string]string{
			"customer": {
				"customer":             "customer",
				"customer_contact":     "customer_contact",
				"customer_birth_chart": "customer_birth_chart",
				"customer_address":     "customer_address",
				"tag":                  "tag",
				"customer_tag":         "customer_tag",
				"finance_record":       "finance_record",
				"customer_consent":     "customer_consent",
				"customer_note":        "customer_note",
			},
			"caring": {
				"caring_plan":       "caring_plan",
				"caring_action":     "caring_action",
				"sentiment_history": "sentiment_history",
				"caring_rule":       "caring_rule",
				"caring_template":   "caring_template",
			},
			"shop": {
				"shopify_customer_map": "shopify_customer_map",
				"webhook_event_log":    "webhook_event_log",
			},
			"scheduler": {
				"tarotist":     "tarotist",
				"availability": "availability",
				"appointment":  "appointment",
				"review":       "review",
			},
		},
		engineEntities: make(map[string]map[string]entityRoute),
	}
}

// RegisterPostgresBackend registers a per-service PostgresBackend.
func (r *Router) RegisterPostgresBackend(service string, backend *PostgresBackend) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.pgBackends[service] = backend
}

// RegisterBackend adds a storage backend for the given engine type.
func (r *Router) RegisterBackend(engine EngineType, backend StorageBackend) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.backends[engine] = backend
}

// RegisterEntity maps a service+entity to a specific engine and target.
// Use this for non-postgres entities (MongoDB collections, InfluxDB measurements, etc.).
func (r *Router) RegisterEntity(service, entity string, engine EngineType, target string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.engineEntities[service] == nil {
		r.engineEntities[service] = make(map[string]entityRoute)
	}
	r.engineEntities[service][entity] = entityRoute{engine: engine, target: target}
}

// Route resolves service+entity to a backend and target name.
func (r *Router) Route(service, entity string) (*RouteResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// 1. Check non-postgres engine entities first (explicit registrations take priority)
	if svcMap, ok := r.engineEntities[service]; ok {
		if route, ok := svcMap[entity]; ok {
			backend, ok := r.backends[route.engine]
			if !ok {
				return nil, fmt.Errorf("backend %q not registered for entity %q", route.engine, entity)
			}
			return &RouteResult{
				Backend:    backend,
				TargetName: route.target,
				Engine:     route.engine,
			}, nil
		}
	}

	// 2. Fall back to PostgreSQL entity table
	tables, ok := r.entityTable[service]
	if !ok {
		return nil, fmt.Errorf("unknown service %q", service)
	}
	tableName, ok := tables[entity]
	if !ok {
		return nil, fmt.Errorf("unknown entity %q in service %q", entity, service)
	}

	// Use the per-service PostgresBackend
	pgBackend, ok := r.pgBackends[service]
	if !ok {
		return nil, fmt.Errorf("no postgres backend registered for service %q", service)
	}

	return &RouteResult{
		Backend:    pgBackend,
		TargetName: tableName,
		Engine:     EnginePostgres,
	}, nil
}

// ValidateEntity checks if a service+entity pair is known.
func (r *Router) ValidateEntity(service, entity string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Check non-postgres routes
	if svcMap, ok := r.engineEntities[service]; ok {
		if _, ok := svcMap[entity]; ok {
			return true
		}
	}

	// Check postgres routes
	tables, ok := r.entityTable[service]
	if !ok {
		return false
	}
	_, ok = tables[entity]
	return ok
}

// AllEntities returns all known (service, entity) pairs.
func (r *Router) AllEntities() []struct{ Service, Entity string } {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var results []struct{ Service, Entity string }

	// Postgres entities
	for svc, entities := range r.entityTable {
		for entity := range entities {
			results = append(results, struct{ Service, Entity string }{svc, entity})
		}
	}

	// Non-postgres entities
	for svc, entities := range r.engineEntities {
		for entity := range entities {
			results = append(results, struct{ Service, Entity string }{svc, entity})
		}
	}

	return results
}

// Backends returns all registered non-postgres backends (for health checks).
func (r *Router) Backends() map[EngineType]StorageBackend {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make(map[EngineType]StorageBackend, len(r.backends))
	for k, v := range r.backends {
		result[k] = v
	}
	return result
}

// PostgresBackends returns all registered per-service postgres backends.
func (r *Router) PostgresBackends() map[string]*PostgresBackend {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make(map[string]*PostgresBackend, len(r.pgBackends))
	for k, v := range r.pgBackends {
		result[k] = v
	}
	return result
}
