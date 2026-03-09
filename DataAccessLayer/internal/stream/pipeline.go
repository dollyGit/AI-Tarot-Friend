// Package stream — Event streaming pipeline using Redis Streams + Kafka.
package stream

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Pipeline is the central event emitter that publishes to Redis Streams and Kafka.
type Pipeline struct {
	redis  *RedisStreamEmitter
	kafka  *KafkaProducer
	logger *zap.Logger
}

// DataEvent is the event payload emitted on writes.
type DataEvent struct {
	EventID   string            `json:"event_id"`
	Service   string            `json:"service"`
	Entity    string            `json:"entity"`
	Operation string            `json:"operation"` // INSERT | UPDATE | DELETE
	Payload   json.RawMessage   `json:"payload"`
	Timestamp int64             `json:"timestamp"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// NewPipeline creates a streaming pipeline.
func NewPipeline(redisClient *redis.Client, kafkaBrokers []string, logger *zap.Logger) *Pipeline {
	return &Pipeline{
		redis:  NewRedisStreamEmitter(redisClient, logger),
		kafka:  NewKafkaProducer(kafkaBrokers, logger),
		logger: logger,
	}
}

// EmitEvent publishes a data event to both Redis Streams and Kafka.
func (p *Pipeline) EmitEvent(ctx context.Context, service, entity, operation string, payload []byte) error {
	event := &DataEvent{
		EventID:   uuid.New().String(),
		Service:   service,
		Entity:    entity,
		Operation: operationToVerb(operation),
		Payload:   json.RawMessage(payload),
		Timestamp: time.Now().UnixMilli(),
	}

	// Publish to Redis Streams (for Subscribe RPC)
	if err := p.redis.Publish(ctx, service, entity, event); err != nil {
		p.logger.Warn("redis stream publish failed", zap.Error(err))
	}

	// Publish to Kafka (for cross-service consumption)
	if err := p.kafka.Produce(ctx, service, entity, event); err != nil {
		p.logger.Warn("kafka produce failed", zap.Error(err))
	}

	return nil
}

// Subscribe reads events from a Redis Stream for the given service/entity.
// It sends events to the provided channel until ctx is done.
func (p *Pipeline) Subscribe(ctx context.Context, service, entity string) (<-chan *DataEvent, error) {
	return p.redis.Subscribe(ctx, service, entity)
}

// Close shuts down the Kafka producer.
func (p *Pipeline) Close() {
	p.kafka.Close()
}

func operationToVerb(op string) string {
	switch op {
	case "create":
		return "INSERT"
	case "update":
		return "UPDATE"
	case "delete":
		return "DELETE"
	default:
		return op
	}
}

// KafkaTopicMapping maps service.entity to Kafka topics.
var KafkaTopicMapping = map[string]string{
	"customer":  "customer.lifecycle",
	"caring":    "caring.actions",
	"shop":      "shop.orders",
	"scheduler": "scheduler.appointments",
	"tarot":     "tarot.readings",
}

// TopicForService returns the Kafka topic for a given service.
func TopicForService(service string) string {
	if topic, ok := KafkaTopicMapping[service]; ok {
		return topic
	}
	return fmt.Sprintf("%s.events", service)
}
