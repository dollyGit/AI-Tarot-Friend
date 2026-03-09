// Package cache — Redis-backed cache manager with 3 strategies:
// read-through, write-through, and write-behind.
package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/tarotfriend/data-access-layer/internal/config"
)

// Manager is the central cache coordinator.
type Manager struct {
	client       *redis.Client
	entityConfig map[string]config.EntityCacheConfig
	logger       *zap.Logger

	// Write-behind buffers (per entity)
	writeBehind map[string]*WriteBehindBuffer
	wbMu        sync.RWMutex
}

// NewManager creates a cache manager with Redis client and entity configs.
func NewManager(client *redis.Client, cacheConfig *config.CacheConfig, logger *zap.Logger) *Manager {
	m := &Manager{
		client:       client,
		entityConfig: cacheConfig.Entities,
		logger:       logger,
		writeBehind:  make(map[string]*WriteBehindBuffer),
	}
	return m
}

// Get retrieves a cached record by service/entity/id.
// Returns nil if not found in cache.
func (m *Manager) Get(ctx context.Context, service, entity, id string) ([]byte, error) {
	key := recordKey(service, entity, id)
	data, err := m.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("cache get %s: %w", key, err)
	}
	return data, nil
}

// GetList retrieves cached query results by filter hash.
func (m *Manager) GetList(ctx context.Context, service, entity string, filters map[string]string) ([][]byte, error) {
	key := listKey(service, entity, filters)
	data, err := m.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("cache get list %s: %w", key, err)
	}

	var records [][]byte
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, fmt.Errorf("cache unmarshal list: %w", err)
	}
	return records, nil
}

// Set stores a record in cache with entity-specific TTL.
func (m *Manager) Set(ctx context.Context, service, entity, id string, data []byte) error {
	ecfg, ok := m.entityConfig[entity]
	if !ok {
		return nil // no cache config for this entity
	}

	key := recordKey(service, entity, id)
	if err := m.client.Set(ctx, key, data, ecfg.TTL).Err(); err != nil {
		return fmt.Errorf("cache set %s: %w", key, err)
	}
	return nil
}

// SetList stores query results in cache with entity-specific TTL.
func (m *Manager) SetList(ctx context.Context, service, entity string, filters map[string]string, records [][]byte) error {
	ecfg, ok := m.entityConfig[entity]
	if !ok {
		return nil
	}

	key := listKey(service, entity, filters)
	data, err := json.Marshal(records)
	if err != nil {
		return fmt.Errorf("cache marshal list: %w", err)
	}

	if err := m.client.Set(ctx, key, data, ecfg.TTL).Err(); err != nil {
		return fmt.Errorf("cache set list %s: %w", key, err)
	}
	return nil
}

// Invalidate removes a record and related list caches for an entity.
func (m *Manager) Invalidate(ctx context.Context, service, entity, id string) error {
	// Delete the specific record cache
	recordK := recordKey(service, entity, id)
	if err := m.client.Del(ctx, recordK).Err(); err != nil {
		m.logger.Warn("cache invalidate record failed", zap.String("key", recordK), zap.Error(err))
	}

	// Delete all list caches for this service+entity
	pattern := fmt.Sprintf("dal:cache:%s:%s:list:*", service, entity)
	return m.deleteByPattern(ctx, pattern)
}

// Strategy returns the cache strategy for a given entity.
func (m *Manager) Strategy(entity string) string {
	ecfg, ok := m.entityConfig[entity]
	if !ok {
		return ""
	}
	return ecfg.Strategy
}

// GetWriteBehindBuffer returns (or creates) a write-behind buffer for an entity.
func (m *Manager) GetWriteBehindBuffer(entity string, flushFn func(ctx context.Context, items []WriteBehindItem) error) *WriteBehindBuffer {
	m.wbMu.Lock()
	defer m.wbMu.Unlock()

	if buf, ok := m.writeBehind[entity]; ok {
		return buf
	}

	ecfg := m.entityConfig[entity]
	flushInterval := ecfg.FlushInterval
	if flushInterval == 0 {
		flushInterval = time.Second // default
	}

	buf := NewWriteBehindBuffer(entity, 100, flushInterval, flushFn, m.logger)
	m.writeBehind[entity] = buf
	return buf
}

// Close shuts down all write-behind buffers.
func (m *Manager) Close() {
	m.wbMu.RLock()
	defer m.wbMu.RUnlock()
	for _, buf := range m.writeBehind {
		buf.Close()
	}
}

// HealthCheck pings Redis and returns status.
func (m *Manager) HealthCheck(ctx context.Context) string {
	if err := m.client.Ping(ctx).Err(); err != nil {
		return fmt.Sprintf("unhealthy: %v", err)
	}
	return "healthy"
}

// ── Key formatting ───────────────────────────────────────

func recordKey(service, entity, id string) string {
	return fmt.Sprintf("dal:cache:%s:%s:%s", service, entity, id)
}

func listKey(service, entity string, filters map[string]string) string {
	hash := filterHash(filters)
	return fmt.Sprintf("dal:cache:%s:%s:list:%s", service, entity, hash)
}

func filterHash(filters map[string]string) string {
	if len(filters) == 0 {
		return "all"
	}
	keys := make([]string, 0, len(filters))
	for k := range filters {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var b strings.Builder
	for _, k := range keys {
		b.WriteString(k)
		b.WriteString("=")
		b.WriteString(filters[k])
		b.WriteString("&")
	}
	h := sha256.Sum256([]byte(b.String()))
	return hex.EncodeToString(h[:8]) // 16 hex chars
}

func (m *Manager) deleteByPattern(ctx context.Context, pattern string) error {
	var cursor uint64
	for {
		keys, nextCursor, err := m.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return fmt.Errorf("scanning keys %s: %w", pattern, err)
		}
		if len(keys) > 0 {
			if err := m.client.Del(ctx, keys...).Err(); err != nil {
				m.logger.Warn("cache batch delete failed", zap.Strings("keys", keys), zap.Error(err))
			}
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
	return nil
}
