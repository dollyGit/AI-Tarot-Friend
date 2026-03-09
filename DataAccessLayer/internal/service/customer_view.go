package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"

	"github.com/tarotfriend/data-access-layer/internal/cache"
	"github.com/tarotfriend/data-access-layer/internal/storage"
	dalv1 "github.com/tarotfriend/data-access-layer/pkg/proto/dal/v1"
)

// CustomerViewService aggregates data from all 6 storage engines into a
// single FullCustomerView. Each sub-query runs in parallel with a shared
// context deadline.
type CustomerViewService struct {
	router *storage.Router
	cache  *cache.Manager
	query  *QueryService
	logger *zap.Logger
}

// NewCustomerViewService creates a new CustomerViewService.
func NewCustomerViewService(
	router *storage.Router,
	cacheManager *cache.Manager,
	queryService *QueryService,
	logger *zap.Logger,
) *CustomerViewService {
	return &CustomerViewService{
		router: router,
		cache:  cacheManager,
		query:  queryService,
		logger: logger,
	}
}

// FullCustomerView holds aggregated data from all 6 engines.
type FullCustomerView struct {
	Profile           json.RawMessage `json:"profile"`             // ① PostgreSQL
	BehaviorProfile   json.RawMessage `json:"behavior_profile"`    // ② MongoDB
	SessionPresence   json.RawMessage `json:"session_presence"`    // ③ Redis (cache)
	EngagementTrends  json.RawMessage `json:"engagement_trends"`   // ④ InfluxDB
	MemorySummaries   json.RawMessage `json:"memory_summaries"`    // ⑤ Qdrant
	RelationshipGraph json.RawMessage `json:"relationship_graph"`  // ⑥ Neo4j
}

const (
	viewCachePrefix = "dal:customer_view:"
	viewCacheTTL    = 2 * time.Minute
	viewTimeout     = 400 * time.Millisecond
)

// GetFullView fetches a customer's complete profile across all engines.
// Results are cached for 2 minutes. Each engine query is capped at 400ms.
func (s *CustomerViewService) GetFullView(ctx context.Context, customerID string) (*FullCustomerView, error) {
	// Check cache first
	if s.cache != nil {
		cacheKey := viewCachePrefix + customerID
		cached, err := s.cache.Get(ctx, "customer", "customer_view", customerID)
		if err == nil && cached != nil {
			var view FullCustomerView
			if err := json.Unmarshal(cached, &view); err == nil {
				s.logger.Debug("customer view from cache", zap.String("id", customerID))
				return &view, nil
			}
		}
		_ = cacheKey
	}

	// Fan out to all 6 engines in parallel
	view := &FullCustomerView{}
	viewCtx, cancel := context.WithTimeout(ctx, viewTimeout)
	defer cancel()

	g, gCtx := errgroup.WithContext(viewCtx)

	// ① PostgreSQL — relational profile + contacts
	g.Go(func() error {
		result, err := s.query.Execute(gCtx, "customer", "customer", map[string]string{"id": customerID}, 1, 0, "", dalv1.CachePolicy_CACHE_POLICY_CACHE_FIRST)
		if err != nil {
			s.logger.Warn("profile query failed", zap.Error(err))
			view.Profile = json.RawMessage(`null`)
			return nil // non-fatal
		}
		if len(result.Records) > 0 {
			view.Profile = json.RawMessage(result.Records[0])
		} else {
			view.Profile = json.RawMessage(`null`)
		}
		return nil
	})

	// ② MongoDB — behavior profile
	g.Go(func() error {
		result, err := s.query.Execute(gCtx, "customer", "customer_behavior_profile", map[string]string{"customer_id": customerID}, 1, 0, "", dalv1.CachePolicy_CACHE_POLICY_NO_CACHE)
		if err != nil {
			s.logger.Warn("behavior profile query failed", zap.Error(err))
			view.BehaviorProfile = json.RawMessage(`null`)
			return nil
		}
		if len(result.Records) > 0 {
			view.BehaviorProfile = json.RawMessage(result.Records[0])
		} else {
			view.BehaviorProfile = json.RawMessage(`null`)
		}
		return nil
	})

	// ③ Redis — session/presence (via cache manager directly)
	g.Go(func() error {
		if s.cache == nil {
			view.SessionPresence = json.RawMessage(`null`)
			return nil
		}
		// Try reading the session data from cache
		sessionData, err := s.cache.Get(gCtx, "customer", "session", customerID)
		if err != nil || sessionData == nil {
			view.SessionPresence = json.RawMessage(`{"online": false}`)
		} else {
			view.SessionPresence = json.RawMessage(sessionData)
		}
		return nil
	})

	// ④ InfluxDB — engagement trends (last 30 days)
	g.Go(func() error {
		result, err := s.query.Execute(gCtx, "customer", "customer_engagement", map[string]string{
			"customer_id": customerID,
			"_range":      "-30d",
		}, 100, 0, "", dalv1.CachePolicy_CACHE_POLICY_NO_CACHE)
		if err != nil {
			s.logger.Warn("engagement trends query failed", zap.Error(err))
			view.EngagementTrends = json.RawMessage(`[]`)
			return nil
		}
		view.EngagementTrends = recordsToJSONArray(result.Records)
		return nil
	})

	// ⑤ Qdrant — memory summaries (no vector search needed here, just scroll)
	g.Go(func() error {
		result, err := s.query.Execute(gCtx, "customer", "conversation_summaries", map[string]string{
			"customer_id": customerID,
		}, 10, 0, "", dalv1.CachePolicy_CACHE_POLICY_NO_CACHE)
		if err != nil {
			s.logger.Warn("memory summaries query failed", zap.Error(err))
			view.MemorySummaries = json.RawMessage(`[]`)
			return nil
		}
		view.MemorySummaries = recordsToJSONArray(result.Records)
		return nil
	})

	// ⑥ Neo4j — relationship graph (1-hop neighbors)
	g.Go(func() error {
		result, err := s.query.Execute(gCtx, "customer", "relationship_graph", map[string]string{
			"id":            customerID,
			"_relationship": "KNOWS",
			"_depth":        "2",
		}, 50, 0, "", dalv1.CachePolicy_CACHE_POLICY_NO_CACHE)
		if err != nil {
			s.logger.Warn("relationship graph query failed", zap.Error(err))
			view.RelationshipGraph = json.RawMessage(`[]`)
			return nil
		}
		view.RelationshipGraph = recordsToJSONArray(result.Records)
		return nil
	})

	// Wait for all queries to complete (or timeout)
	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("customer view aggregation: %w", err)
	}

	// Cache the result
	if s.cache != nil {
		viewJSON, err := json.Marshal(view)
		if err == nil {
			if err := s.cache.Set(ctx, "customer", "customer_view", customerID, viewJSON); err != nil {
				s.logger.Warn("failed to cache customer view", zap.Error(err))
			}
		}
	}

	return view, nil
}

// recordsToJSONArray wraps a slice of JSON records into a JSON array.
func recordsToJSONArray(records [][]byte) json.RawMessage {
	if len(records) == 0 {
		return json.RawMessage(`[]`)
	}

	var buf []byte
	buf = append(buf, '[')
	for i, rec := range records {
		if i > 0 {
			buf = append(buf, ',')
		}
		buf = append(buf, rec...)
	}
	buf = append(buf, ']')
	return json.RawMessage(buf)
}
