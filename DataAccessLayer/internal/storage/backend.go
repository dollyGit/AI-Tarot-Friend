// Package storage — multi-engine storage backend abstraction.
//
// StorageBackend provides a unified CRUD interface for all storage engines
// (PostgreSQL, MongoDB, InfluxDB, Qdrant, Neo4j). Each engine implements
// this interface and serializes results to JSON bytes, which is the format
// expected by the cache, streaming, and gRPC layers.
package storage

import "context"

// EngineType identifies a storage engine.
type EngineType string

const (
	EnginePostgres EngineType = "postgres"
	EngineMongo    EngineType = "mongodb"
	EngineInflux   EngineType = "influxdb"
	EngineQdrant   EngineType = "qdrant"
	EngineNeo4j    EngineType = "neo4j"
)

// StorageBackend is the unified interface that all storage engines implement.
// Both QueryRecords and WriteRecord work at the JSON-byte level so the rest
// of the DAL stack (cache, streaming, gRPC) remains engine-agnostic.
type StorageBackend interface {
	// Engine returns which engine this backend is.
	Engine() EngineType

	// QueryRecords reads records from the storage engine.
	//   target  = table (postgres) | collection (mongo/qdrant) | measurement (influx) | label (neo4j)
	//   filters = equality filters; engine-specific keys prefixed with "_" are reserved
	//   returns JSON-encoded records and total count
	QueryRecords(ctx context.Context, target string, filters map[string]string,
		limit, offset int32, orderBy string) (records [][]byte, total int64, err error)

	// WriteRecord creates/updates/deletes a record.
	//   target    = table / collection / measurement / label
	//   operation = "create" | "update" | "delete"
	//   payload   = JSON-encoded entity data
	//   returns   = the record ID
	WriteRecord(ctx context.Context, target string, operation string,
		payload []byte) (id string, err error)

	// Ping checks connectivity.
	Ping(ctx context.Context) error

	// Close releases resources.
	Close()
}
