package stream

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// RedisStreamEmitter publishes and subscribes to Redis Streams.
type RedisStreamEmitter struct {
	client *redis.Client
	logger *zap.Logger
}

// NewRedisStreamEmitter creates a new Redis Streams emitter.
func NewRedisStreamEmitter(client *redis.Client, logger *zap.Logger) *RedisStreamEmitter {
	return &RedisStreamEmitter{client: client, logger: logger}
}

// Publish adds an event to a Redis Stream via XADD.
func (e *RedisStreamEmitter) Publish(ctx context.Context, service, entity string, event *DataEvent) error {
	streamKey := streamKey(service, entity)
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshaling event: %w", err)
	}

	_, err = e.client.XAdd(ctx, &redis.XAddArgs{
		Stream: streamKey,
		Values: map[string]interface{}{
			"data": string(data),
		},
		MaxLen: 10000, // Keep last 10K events per stream
		Approx: true,
	}).Result()
	if err != nil {
		return fmt.Errorf("XADD %s: %w", streamKey, err)
	}

	return nil
}

// Subscribe reads events from a Redis Stream, returning a channel of events.
// Blocks up to 5s per read. Continues until ctx is cancelled.
func (e *RedisStreamEmitter) Subscribe(ctx context.Context, service, entity string) (<-chan *DataEvent, error) {
	streamKey := streamKey(service, entity)
	ch := make(chan *DataEvent, 64)

	go func() {
		defer close(ch)
		lastID := "$" // Only new messages

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			result, err := e.client.XRead(ctx, &redis.XReadArgs{
				Streams: []string{streamKey, lastID},
				Block:   5 * time.Second,
				Count:   100,
			}).Result()

			if err != nil {
				if err == redis.Nil || ctx.Err() != nil {
					continue
				}
				e.logger.Warn("XREAD failed", zap.String("stream", streamKey), zap.Error(err))
				time.Sleep(time.Second) // back off
				continue
			}

			for _, stream := range result {
				for _, msg := range stream.Messages {
					lastID = msg.ID
					data, ok := msg.Values["data"].(string)
					if !ok {
						continue
					}
					var event DataEvent
					if err := json.Unmarshal([]byte(data), &event); err != nil {
						e.logger.Warn("event unmarshal failed", zap.Error(err))
						continue
					}
					select {
					case ch <- &event:
					case <-ctx.Done():
						return
					}
				}
			}
		}
	}()

	return ch, nil
}

func streamKey(service, entity string) string {
	return fmt.Sprintf("dal:stream:%s:%s", service, entity)
}
