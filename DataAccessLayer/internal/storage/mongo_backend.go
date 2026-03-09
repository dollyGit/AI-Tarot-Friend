package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.uber.org/zap"
)

// MongoBackend implements StorageBackend for MongoDB.
type MongoBackend struct {
	client   *mongo.Client
	database *mongo.Database
	logger   *zap.Logger
}

// NewMongoBackend connects to MongoDB and returns a backend.
func NewMongoBackend(ctx context.Context, uri, dbName string, logger *zap.Logger) (*MongoBackend, error) {
	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("connecting to MongoDB: %w", err)
	}

	// Verify connectivity
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx, nil); err != nil {
		return nil, fmt.Errorf("pinging MongoDB: %w", err)
	}

	db := client.Database(dbName)

	backend := &MongoBackend{
		client:   client,
		database: db,
		logger:   logger,
	}

	// Set up TTL index for conversation_raw (3 years = ~1095 days)
	backend.ensureTTLIndex(ctx, "conversation_raw", "created_at", 1095*24*time.Hour)

	logger.Info("MongoDB backend initialized",
		zap.String("uri", uri),
		zap.String("database", dbName),
	)

	return backend, nil
}

func (b *MongoBackend) Engine() EngineType {
	return EngineMongo
}

func (b *MongoBackend) QueryRecords(ctx context.Context, target string, filters map[string]string, limit, offset int32, orderBy string) ([][]byte, int64, error) {
	coll := b.database.Collection(target)

	// Build BSON filter
	bsonFilter := bson.M{}
	for k, v := range filters {
		bsonFilter[k] = v
	}

	// Count
	total, err := coll.CountDocuments(ctx, bsonFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("counting %s: %w", target, err)
	}

	// Find
	findOpts := options.Find()
	if limit > 0 {
		findOpts.SetLimit(int64(limit))
	}
	if offset > 0 {
		findOpts.SetSkip(int64(offset))
	}
	if orderBy != "" {
		dir := 1 // ASC
		col := orderBy
		if len(orderBy) > 5 && orderBy[len(orderBy)-5:] == ":desc" {
			dir = -1
			col = orderBy[:len(orderBy)-5]
		} else if len(orderBy) > 4 && orderBy[len(orderBy)-4:] == ":asc" {
			col = orderBy[:len(orderBy)-4]
		}
		findOpts.SetSort(bson.D{{Key: col, Value: dir}})
	}

	cursor, err := coll.Find(ctx, bsonFilter, findOpts)
	if err != nil {
		return nil, 0, fmt.Errorf("finding in %s: %w", target, err)
	}
	defer cursor.Close(ctx)

	var records [][]byte
	for cursor.Next(ctx) {
		// Decode to a generic map, then marshal to JSON
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			return nil, 0, fmt.Errorf("decoding document: %w", err)
		}

		// Convert ObjectID to string for JSON compatibility
		if oid, ok := doc["_id"]; ok {
			doc["_id"] = fmt.Sprintf("%v", oid)
		}

		jsonBytes, err := json.Marshal(doc)
		if err != nil {
			return nil, 0, fmt.Errorf("marshaling document: %w", err)
		}
		records = append(records, jsonBytes)
	}

	if err := cursor.Err(); err != nil {
		return nil, 0, fmt.Errorf("cursor error: %w", err)
	}

	return records, total, nil
}

func (b *MongoBackend) WriteRecord(ctx context.Context, target string, operation string, payload []byte) (string, error) {
	coll := b.database.Collection(target)

	var doc bson.M
	if err := json.Unmarshal(payload, &doc); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}

	switch operation {
	case "create":
		// Add created_at if not present
		if _, ok := doc["created_at"]; !ok {
			doc["created_at"] = time.Now()
		}

		result, err := coll.InsertOne(ctx, doc)
		if err != nil {
			return "", fmt.Errorf("inserting into %s: %w", target, err)
		}
		return fmt.Sprintf("%v", result.InsertedID), nil

	case "update":
		id, ok := doc["_id"]
		if !ok {
			id, ok = doc["id"]
		}
		if !ok {
			return "", fmt.Errorf("_id or id is required for update")
		}
		idStr := fmt.Sprintf("%v", id)
		delete(doc, "_id")
		delete(doc, "id")

		doc["updated_at"] = time.Now()

		filter := bson.M{"_id": id}
		// Try ObjectID first, fall back to string
		if oid, err := bson.ObjectIDFromHex(idStr); err == nil {
			filter = bson.M{"_id": oid}
		}

		result, err := coll.UpdateOne(ctx, filter, bson.M{"$set": doc})
		if err != nil {
			return "", fmt.Errorf("updating %s: %w", target, err)
		}
		if result.MatchedCount == 0 {
			return "", fmt.Errorf("no document found with id %v", id)
		}
		return idStr, nil

	case "delete":
		id, ok := doc["_id"]
		if !ok {
			id, ok = doc["id"]
		}
		if !ok {
			return "", fmt.Errorf("_id or id is required for delete")
		}
		idStr := fmt.Sprintf("%v", id)

		filter := bson.M{"_id": id}
		if oid, err := bson.ObjectIDFromHex(idStr); err == nil {
			filter = bson.M{"_id": oid}
		}

		result, err := coll.DeleteOne(ctx, filter)
		if err != nil {
			return "", fmt.Errorf("deleting from %s: %w", target, err)
		}
		if result.DeletedCount == 0 {
			return "", fmt.Errorf("no document found with id %v", id)
		}
		return idStr, nil

	default:
		return "", fmt.Errorf("unknown operation %q", operation)
	}
}

func (b *MongoBackend) Ping(ctx context.Context) error {
	return b.client.Ping(ctx, nil)
}

func (b *MongoBackend) Close() {
	if err := b.client.Disconnect(context.Background()); err != nil {
		b.logger.Warn("error disconnecting MongoDB", zap.Error(err))
	}
}

// ensureTTLIndex creates a TTL index on a collection if it doesn't already exist.
func (b *MongoBackend) ensureTTLIndex(ctx context.Context, collection, field string, expiry time.Duration) {
	coll := b.database.Collection(collection)
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: field, Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(int32(expiry.Seconds())),
	}
	if _, err := coll.Indexes().CreateOne(ctx, indexModel); err != nil {
		b.logger.Warn("failed to create TTL index",
			zap.String("collection", collection),
			zap.String("field", field),
			zap.Error(err),
		)
	}
}
