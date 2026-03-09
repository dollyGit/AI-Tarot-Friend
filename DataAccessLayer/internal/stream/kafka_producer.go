package stream

import (
	"context"
	"encoding/json"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// KafkaProducer writes events to Kafka topics.
type KafkaProducer struct {
	writers map[string]*kafka.Writer
	brokers []string
	logger  *zap.Logger
}

// NewKafkaProducer creates a Kafka producer with topic-specific writers.
func NewKafkaProducer(brokers []string, logger *zap.Logger) *KafkaProducer {
	kp := &KafkaProducer{
		writers: make(map[string]*kafka.Writer),
		brokers: brokers,
		logger:  logger,
	}

	// Pre-create writers for known topics
	for _, topic := range KafkaTopicMapping {
		kp.writers[topic] = &kafka.Writer{
			Addr:         kafka.TCP(brokers...),
			Topic:        topic,
			Balancer:     &kafka.LeastBytes{},
			BatchTimeout: 100 * time.Millisecond,
			RequiredAcks: kafka.RequireOne,
			Async:        true,
		}
	}

	return kp
}

// Produce writes an event to the appropriate Kafka topic.
func (kp *KafkaProducer) Produce(ctx context.Context, service, entity string, event *DataEvent) error {
	topic := TopicForService(service)
	writer, ok := kp.writers[topic]
	if !ok {
		// Create writer on demand for unknown topics
		writer = &kafka.Writer{
			Addr:         kafka.TCP(kp.brokers...),
			Topic:        topic,
			Balancer:     &kafka.LeastBytes{},
			BatchTimeout: 100 * time.Millisecond,
			RequiredAcks: kafka.RequireOne,
			Async:        true,
		}
		kp.writers[topic] = writer
	}

	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(event.EventID),
		Value: data,
	})
}

// Close shuts down all Kafka writers.
func (kp *KafkaProducer) Close() {
	for topic, writer := range kp.writers {
		if err := writer.Close(); err != nil {
			kp.logger.Warn("kafka writer close failed", zap.String("topic", topic), zap.Error(err))
		}
	}
}
