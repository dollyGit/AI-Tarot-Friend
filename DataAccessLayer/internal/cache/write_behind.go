package cache

import (
	"context"
	"sync"
	"time"

	"go.uber.org/zap"
)

// WriteBehindItem represents a buffered write operation.
type WriteBehindItem struct {
	Service   string
	Entity    string
	Operation string
	ID        string
	Payload   []byte
}

// WriteBehindBuffer accumulates write operations and flushes them periodically.
type WriteBehindBuffer struct {
	entity        string
	maxSize       int
	flushInterval time.Duration
	flushFn       func(ctx context.Context, items []WriteBehindItem) error
	logger        *zap.Logger

	items  []WriteBehindItem
	mu     sync.Mutex
	stopCh chan struct{}
	wg     sync.WaitGroup
}

// NewWriteBehindBuffer creates a new write-behind buffer with periodic flushing.
func NewWriteBehindBuffer(
	entity string,
	maxSize int,
	flushInterval time.Duration,
	flushFn func(ctx context.Context, items []WriteBehindItem) error,
	logger *zap.Logger,
) *WriteBehindBuffer {
	wb := &WriteBehindBuffer{
		entity:        entity,
		maxSize:       maxSize,
		flushInterval: flushInterval,
		flushFn:       flushFn,
		logger:        logger,
		items:         make([]WriteBehindItem, 0, maxSize),
		stopCh:        make(chan struct{}),
	}

	wb.wg.Add(1)
	go wb.flushLoop()

	return wb
}

// Add adds a write item to the buffer. Flushes immediately if buffer is full.
func (wb *WriteBehindBuffer) Add(item WriteBehindItem) {
	wb.mu.Lock()
	wb.items = append(wb.items, item)
	shouldFlush := len(wb.items) >= wb.maxSize
	wb.mu.Unlock()

	if shouldFlush {
		wb.flush()
	}
}

// Close stops the flush loop and flushes remaining items.
func (wb *WriteBehindBuffer) Close() {
	close(wb.stopCh)
	wb.wg.Wait()
	wb.flush() // Final flush
}

func (wb *WriteBehindBuffer) flushLoop() {
	defer wb.wg.Done()
	ticker := time.NewTicker(wb.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			wb.flush()
		case <-wb.stopCh:
			return
		}
	}
}

func (wb *WriteBehindBuffer) flush() {
	wb.mu.Lock()
	if len(wb.items) == 0 {
		wb.mu.Unlock()
		return
	}
	items := wb.items
	wb.items = make([]WriteBehindItem, 0, wb.maxSize)
	wb.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := wb.flushFn(ctx, items); err != nil {
		wb.logger.Error("write-behind flush failed",
			zap.String("entity", wb.entity),
			zap.Int("items", len(items)),
			zap.Error(err),
		)
		// Re-enqueue failed items
		wb.mu.Lock()
		wb.items = append(items, wb.items...)
		wb.mu.Unlock()
	} else {
		wb.logger.Debug("write-behind flushed",
			zap.String("entity", wb.entity),
			zap.Int("items", len(items)),
		)
	}
}
