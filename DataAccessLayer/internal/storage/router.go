package storage

import (
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RouteResult is the resolved target for a service+entity pair.
type RouteResult struct {
	Pool      *pgxpool.Pool
	TableName string
}

// Router maps (service, entity) → (pool, table_name).
type Router struct {
	pools       *PoolManager
	entityTable map[string]map[string]string // service → entity → table_name
}

// NewRouter creates a storage router with known entity→table mappings.
func NewRouter(pools *PoolManager) *Router {
	return &Router{
		pools: pools,
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
	}
}

// Route resolves service+entity to a pool and table name.
func (r *Router) Route(service, entity string) (*RouteResult, error) {
	tables, ok := r.entityTable[service]
	if !ok {
		return nil, fmt.Errorf("unknown service %q", service)
	}
	tableName, ok := tables[entity]
	if !ok {
		return nil, fmt.Errorf("unknown entity %q in service %q", entity, service)
	}
	pool, err := r.pools.Pool(service)
	if err != nil {
		return nil, err
	}
	return &RouteResult{Pool: pool, TableName: tableName}, nil
}

// ValidateEntity checks if a service+entity pair is known.
func (r *Router) ValidateEntity(service, entity string) bool {
	tables, ok := r.entityTable[service]
	if !ok {
		return false
	}
	_, ok = tables[entity]
	return ok
}

// AllEntities returns all known (service, entity) pairs.
func (r *Router) AllEntities() []struct{ Service, Entity string } {
	var results []struct{ Service, Entity string }
	for svc, entities := range r.entityTable {
		for entity := range entities {
			results = append(results, struct{ Service, Entity string }{svc, entity})
		}
	}
	return results
}
