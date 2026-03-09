package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.uber.org/zap"
)

// Neo4jBackend implements StorageBackend for Neo4j graph database.
type Neo4jBackend struct {
	driver neo4j.DriverWithContext
	logger *zap.Logger
}

// Neo4j Node and Edge type constants for TarotFriend's knowledge graph.
var (
	// NodeLabels — 12+ node types
	NodeLabels = []string{
		"Customer", "Person", "Event", "Topic",
		"TarotCard", "DivinationChart", "ZodiacSign", "CelestialBody",
		"BaziElement", "ZiweiStar", "Palace", "Crystal", "Emotion",
	}

	// EdgeTypes — 11+ relationship types
	EdgeTypes = []string{
		"KNOWS", "HAS_CHART", "SYNASTRY_WITH", "PLANET_IN_SIGN",
		"ELEMENT_MATCHES", "PURCHASED", "INTERESTED_IN", "CONSULTED_ON",
		"RELATES_TO", "TRIGGERED", "ASSOCIATED_WITH",
	}
)

// NewNeo4jBackend connects to Neo4j and returns a backend.
func NewNeo4jBackend(ctx context.Context, uri, username, password string, logger *zap.Logger) (*Neo4jBackend, error) {
	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(username, password, ""))
	if err != nil {
		return nil, fmt.Errorf("creating Neo4j driver: %w", err)
	}

	// Verify connectivity
	if err := driver.VerifyConnectivity(ctx); err != nil {
		return nil, fmt.Errorf("connecting to Neo4j: %w", err)
	}

	backend := &Neo4jBackend{
		driver: driver,
		logger: logger,
	}

	// Create constraints and indexes
	backend.ensureConstraints(ctx)

	logger.Info("Neo4j backend initialized", zap.String("uri", uri))
	return backend, nil
}

func (b *Neo4jBackend) Engine() EngineType {
	return EngineNeo4j
}

func (b *Neo4jBackend) QueryRecords(ctx context.Context, target string, filters map[string]string, limit, offset int32, orderBy string) ([][]byte, int64, error) {
	// Check for raw Cypher query
	if cypher, ok := filters["_cypher"]; ok {
		return b.executeCypher(ctx, cypher, filters)
	}

	// Check for relationship query
	if relType, ok := filters["_relationship"]; ok {
		return b.queryRelationships(ctx, target, relType, filters, limit, offset)
	}

	// Default: query nodes by label
	return b.queryNodes(ctx, target, filters, limit, offset, orderBy)
}

func (b *Neo4jBackend) queryNodes(ctx context.Context, label string, filters map[string]string, limit, offset int32, orderBy string) ([][]byte, int64, error) {
	// Build WHERE clause
	whereClause, params := buildNeo4jWhere(filters)

	// Count query
	countCypher := fmt.Sprintf("MATCH (n:%s)%s RETURN count(n) AS total", label, whereClause)
	total, err := b.queryCount(ctx, countCypher, params)
	if err != nil {
		return nil, 0, err
	}

	// Select query
	cypher := fmt.Sprintf("MATCH (n:%s)%s RETURN n", label, whereClause)

	if orderBy != "" {
		col := orderBy
		dir := "ASC"
		if len(orderBy) > 5 && orderBy[len(orderBy)-5:] == ":desc" {
			dir = "DESC"
			col = orderBy[:len(orderBy)-5]
		} else if len(orderBy) > 4 && orderBy[len(orderBy)-4:] == ":asc" {
			col = orderBy[:len(orderBy)-4]
		}
		cypher += fmt.Sprintf(" ORDER BY n.%s %s", col, dir)
	}

	if offset > 0 {
		cypher += fmt.Sprintf(" SKIP %d", offset)
	}
	if limit > 0 {
		cypher += fmt.Sprintf(" LIMIT %d", limit)
	}

	records, err := b.runQuery(ctx, cypher, params)
	if err != nil {
		return nil, 0, err
	}

	return records, total, nil
}

func (b *Neo4jBackend) queryRelationships(ctx context.Context, label, relType string, filters map[string]string, limit, offset int32) ([][]byte, int64, error) {
	depth := "1"
	if d, ok := filters["_depth"]; ok {
		depth = d
	}

	// Build optional WHERE
	whereClause, params := buildNeo4jWhere(filters)

	cypher := fmt.Sprintf(
		"MATCH (n:%s)-[r:%s*1..%s]-(m)%s RETURN n, r, m, labels(m) AS target_labels",
		label, relType, depth, whereClause,
	)

	if limit > 0 {
		cypher += fmt.Sprintf(" LIMIT %d", limit)
	}

	records, err := b.runRelQuery(ctx, cypher, params)
	if err != nil {
		return nil, 0, err
	}

	return records, int64(len(records)), nil
}

func (b *Neo4jBackend) executeCypher(ctx context.Context, cypher string, filters map[string]string) ([][]byte, int64, error) {
	params := make(map[string]interface{})
	for k, v := range filters {
		if k[0] == '_' {
			continue
		}
		params[k] = v
	}

	records, err := b.runQuery(ctx, cypher, params)
	if err != nil {
		return nil, 0, err
	}

	return records, int64(len(records)), nil
}

func (b *Neo4jBackend) WriteRecord(ctx context.Context, target string, operation string, payload []byte) (string, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	switch operation {
	case "create":
		return b.createNode(ctx, target, data)
	case "update":
		return b.updateNode(ctx, target, data)
	case "delete":
		return b.deleteNode(ctx, target, data)
	default:
		return "", fmt.Errorf("unknown operation %q", operation)
	}
}

func (b *Neo4jBackend) createNode(ctx context.Context, label string, data map[string]interface{}) (string, error) {
	// Check if this is a relationship creation
	if fromID, ok := data["_from_id"]; ok {
		return b.createRelationship(ctx, label, data, fmt.Sprintf("%v", fromID))
	}

	// MERGE node (idempotent create)
	id, _ := data["id"].(string)
	if id == "" {
		return "", fmt.Errorf("id is required for node creation")
	}

	// Build properties
	props := make(map[string]interface{})
	for k, v := range data {
		if k[0] == '_' {
			continue
		}
		props[k] = v
	}

	cypher := fmt.Sprintf("MERGE (n:%s {id: $id}) SET n += $props RETURN n.id AS id", label)
	params := map[string]interface{}{
		"id":    id,
		"props": props,
	}

	session := b.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	result, err := session.Run(ctx, cypher, params)
	if err != nil {
		return "", fmt.Errorf("creating node %s: %w", label, err)
	}

	if result.Next(ctx) {
		return fmt.Sprintf("%v", result.Record().Values[0]), nil
	}
	return id, nil
}

func (b *Neo4jBackend) createRelationship(ctx context.Context, relType string, data map[string]interface{}, fromID string) (string, error) {
	toID, ok := data["_to_id"]
	if !ok {
		return "", fmt.Errorf("_to_id is required for relationship creation")
	}

	fromLabel, _ := data["_from_label"].(string)
	toLabel, _ := data["_to_label"].(string)
	if fromLabel == "" {
		fromLabel = "Customer" // default
	}
	if toLabel == "" {
		toLabel = "Customer" // default
	}

	// Build relationship properties
	props := make(map[string]interface{})
	for k, v := range data {
		if k[0] == '_' || k == "id" {
			continue
		}
		props[k] = v
	}

	cypher := fmt.Sprintf(
		"MATCH (a:%s {id: $from_id}), (b:%s {id: $to_id}) "+
			"MERGE (a)-[r:%s]->(b) SET r += $props RETURN type(r) AS rel_type",
		fromLabel, toLabel, relType,
	)
	params := map[string]interface{}{
		"from_id": fromID,
		"to_id":   fmt.Sprintf("%v", toID),
		"props":   props,
	}

	session := b.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.Run(ctx, cypher, params)
	if err != nil {
		return "", fmt.Errorf("creating relationship %s: %w", relType, err)
	}

	return fmt.Sprintf("%s->%s->%v", fromID, relType, toID), nil
}

func (b *Neo4jBackend) updateNode(ctx context.Context, label string, data map[string]interface{}) (string, error) {
	id, ok := data["id"].(string)
	if !ok || id == "" {
		return "", fmt.Errorf("id is required for update")
	}

	props := make(map[string]interface{})
	for k, v := range data {
		if k == "id" || k[0] == '_' {
			continue
		}
		props[k] = v
	}

	cypher := fmt.Sprintf("MATCH (n:%s {id: $id}) SET n += $props RETURN n.id AS id", label)
	params := map[string]interface{}{
		"id":    id,
		"props": props,
	}

	session := b.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	result, err := session.Run(ctx, cypher, params)
	if err != nil {
		return "", fmt.Errorf("updating node %s: %w", label, err)
	}

	if !result.Next(ctx) {
		return "", fmt.Errorf("no node found with id %q", id)
	}

	return id, nil
}

func (b *Neo4jBackend) deleteNode(ctx context.Context, label string, data map[string]interface{}) (string, error) {
	id, ok := data["id"].(string)
	if !ok || id == "" {
		return "", fmt.Errorf("id is required for delete")
	}

	// DETACH DELETE removes the node and all its relationships
	cypher := fmt.Sprintf("MATCH (n:%s {id: $id}) DETACH DELETE n", label)
	params := map[string]interface{}{"id": id}

	session := b.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.Run(ctx, cypher, params)
	if err != nil {
		return "", fmt.Errorf("deleting node %s: %w", label, err)
	}

	return id, nil
}

func (b *Neo4jBackend) Ping(ctx context.Context) error {
	return b.driver.VerifyConnectivity(ctx)
}

func (b *Neo4jBackend) Close() {
	if err := b.driver.Close(context.Background()); err != nil {
		b.logger.Warn("error closing Neo4j driver", zap.Error(err))
	}
}

// ensureConstraints creates uniqueness constraints and indexes for known node types.
func (b *Neo4jBackend) ensureConstraints(ctx context.Context) {
	constraints := []struct {
		label    string
		property string
	}{
		{"Customer", "id"},
		{"Person", "id"},
		{"TarotCard", "name"},
		{"ZodiacSign", "name"},
		{"CelestialBody", "name"},
		{"BaziElement", "name"},
		{"ZiweiStar", "name"},
		{"Crystal", "name"},
		{"Emotion", "name"},
	}

	session := b.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	for _, c := range constraints {
		cypher := fmt.Sprintf(
			"CREATE CONSTRAINT IF NOT EXISTS FOR (n:%s) REQUIRE n.%s IS UNIQUE",
			c.label, c.property,
		)
		if _, err := session.Run(ctx, cypher, nil); err != nil {
			b.logger.Warn("failed to create constraint",
				zap.String("label", c.label),
				zap.String("property", c.property),
				zap.Error(err),
			)
		}
	}

	// Index on Event.timestamp for time-range queries
	if _, err := session.Run(ctx,
		"CREATE INDEX IF NOT EXISTS FOR (e:Event) ON (e.timestamp)", nil); err != nil {
		b.logger.Warn("failed to create Event.timestamp index", zap.Error(err))
	}
}

// ── Helpers ────────────────────────────────────────────────

func buildNeo4jWhere(filters map[string]string) (string, map[string]interface{}) {
	params := make(map[string]interface{})
	var conditions []string

	for k, v := range filters {
		if k[0] == '_' {
			continue // skip internal keys
		}
		paramName := "f_" + k
		conditions = append(conditions, fmt.Sprintf("n.%s = $%s", k, paramName))
		params[paramName] = v
	}

	if len(conditions) == 0 {
		return "", params
	}

	return " WHERE " + strings.Join(conditions, " AND "), params
}

func (b *Neo4jBackend) runQuery(ctx context.Context, cypher string, params map[string]interface{}) ([][]byte, error) {
	session := b.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	b.logger.Debug("neo4j query", zap.String("cypher", cypher))

	result, err := session.Run(ctx, cypher, params)
	if err != nil {
		return nil, fmt.Errorf("running Cypher: %w", err)
	}

	var records [][]byte
	for result.Next(ctx) {
		record := result.Record()
		// Try to extract node properties
		m := make(map[string]interface{})
		for i, key := range record.Keys {
			val := record.Values[i]
			// If it's a Node, extract properties
			if node, ok := val.(neo4j.Node); ok {
				m["_labels"] = node.Labels
				for pk, pv := range node.Props {
					m[pk] = pv
				}
			} else {
				m[key] = val
			}
		}

		jsonBytes, err := json.Marshal(m)
		if err != nil {
			return nil, fmt.Errorf("marshaling record: %w", err)
		}
		records = append(records, jsonBytes)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("result error: %w", err)
	}

	return records, nil
}

func (b *Neo4jBackend) runRelQuery(ctx context.Context, cypher string, params map[string]interface{}) ([][]byte, error) {
	session := b.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	b.logger.Debug("neo4j rel query", zap.String("cypher", cypher))

	result, err := session.Run(ctx, cypher, params)
	if err != nil {
		return nil, fmt.Errorf("running Cypher: %w", err)
	}

	var records [][]byte
	for result.Next(ctx) {
		record := result.Record()
		m := make(map[string]interface{})

		for i, key := range record.Keys {
			val := record.Values[i]
			switch v := val.(type) {
			case neo4j.Node:
				nodeMap := map[string]interface{}{
					"labels": v.Labels,
				}
				for pk, pv := range v.Props {
					nodeMap[pk] = pv
				}
				m[key] = nodeMap
			case neo4j.Relationship:
				m[key] = map[string]interface{}{
					"type":  v.Type,
					"props": v.Props,
				}
			default:
				m[key] = val
			}
		}

		jsonBytes, err := json.Marshal(m)
		if err != nil {
			return nil, fmt.Errorf("marshaling record: %w", err)
		}
		records = append(records, jsonBytes)
	}

	return records, nil
}

func (b *Neo4jBackend) queryCount(ctx context.Context, cypher string, params map[string]interface{}) (int64, error) {
	session := b.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.Run(ctx, cypher, params)
	if err != nil {
		return 0, fmt.Errorf("running count query: %w", err)
	}

	if result.Next(ctx) {
		val, ok := result.Record().Values[0].(int64)
		if ok {
			return val, nil
		}
	}

	return 0, nil
}
