// Package storage — PostgreSQL connection pool manager and query routing.
package storage

import (
	"context"
	"fmt"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"github.com/tarotfriend/data-access-layer/internal/config"
)

// PoolManager manages multiple PostgreSQL connection pools (one per service DB).
type PoolManager struct {
	pools  map[string]*pgxpool.Pool
	logger *zap.Logger
	mu     sync.RWMutex
}

// NewPoolManager creates pools for all configured databases.
func NewPoolManager(ctx context.Context, databases map[string]config.DBConfig, logger *zap.Logger) (*PoolManager, error) {
	pm := &PoolManager{
		pools:  make(map[string]*pgxpool.Pool, len(databases)),
		logger: logger,
	}

	for name, dbCfg := range databases {
		poolCfg, err := pgxpool.ParseConfig(dbCfg.URL)
		if err != nil {
			return nil, fmt.Errorf("parsing DB config for %q: %w", name, err)
		}
		poolCfg.MaxConns = dbCfg.MaxConns

		pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
		if err != nil {
			// Close already-opened pools on failure
			pm.Close()
			return nil, fmt.Errorf("connecting to DB %q: %w", name, err)
		}

		// Verify connectivity
		if err := pool.Ping(ctx); err != nil {
			pm.Close()
			return nil, fmt.Errorf("pinging DB %q: %w", name, err)
		}

		pm.pools[name] = pool
		logger.Info("database pool created",
			zap.String("database", name),
			zap.Int32("max_conns", dbCfg.MaxConns),
		)
	}

	return pm, nil
}

// Pool returns the connection pool for a given service name.
func (pm *PoolManager) Pool(service string) (*pgxpool.Pool, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	pool, ok := pm.pools[service]
	if !ok {
		return nil, fmt.Errorf("no database pool for service %q", service)
	}
	return pool, nil
}

// HealthCheck pings all databases and returns status details.
func (pm *PoolManager) HealthCheck(ctx context.Context) map[string]string {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	details := make(map[string]string, len(pm.pools))
	for name, pool := range pm.pools {
		if err := pool.Ping(ctx); err != nil {
			details[name+"_db"] = fmt.Sprintf("unhealthy: %v", err)
		} else {
			stat := pool.Stat()
			details[name+"_db"] = fmt.Sprintf("healthy (conns: %d/%d)", stat.AcquiredConns(), stat.MaxConns())
		}
	}
	return details
}

// Close shuts down all connection pools.
func (pm *PoolManager) Close() {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	for name, pool := range pm.pools {
		pool.Close()
		pm.logger.Info("database pool closed", zap.String("database", name))
	}
}
