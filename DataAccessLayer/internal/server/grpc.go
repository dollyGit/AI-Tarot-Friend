// Package server — gRPC server implementation using generated proto stubs.
package server

import (
	"context"
	"io"
	"strings"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	dalv1 "github.com/tarotfriend/data-access-layer/pkg/proto/dal/v1"

	"github.com/tarotfriend/data-access-layer/internal/cache"
	"github.com/tarotfriend/data-access-layer/internal/service"
	"github.com/tarotfriend/data-access-layer/internal/storage"
	"github.com/tarotfriend/data-access-layer/internal/stream"
)

// GRPCServer implements the DataAccessService gRPC interface.
type GRPCServer struct {
	dalv1.UnimplementedDataAccessServiceServer

	query    *service.QueryService
	write    *service.WriteService
	pools    *storage.PoolManager
	cache    *cache.Manager
	pipeline *stream.Pipeline
	logger   *zap.Logger
}

// NewGRPCServer creates a new gRPC server with all dependencies.
func NewGRPCServer(
	query *service.QueryService,
	write *service.WriteService,
	pools *storage.PoolManager,
	cacheManager *cache.Manager,
	pipeline *stream.Pipeline,
	logger *zap.Logger,
) *GRPCServer {
	return &GRPCServer{
		query:    query,
		write:    write,
		pools:    pools,
		cache:    cacheManager,
		pipeline: pipeline,
		logger:   logger,
	}
}

// Query handles synchronous read requests.
func (s *GRPCServer) Query(ctx context.Context, req *dalv1.QueryRequest) (*dalv1.QueryResponse, error) {
	if req.Service == "" || req.Entity == "" {
		return nil, status.Error(codes.InvalidArgument, "service and entity are required")
	}

	result, err := s.query.Execute(ctx, req.Service, req.Entity, req.Filters, req.Limit, req.Offset, req.OrderBy, req.CachePolicy)
	if err != nil {
		s.logger.Error("query failed",
			zap.String("service", req.Service),
			zap.String("entity", req.Entity),
			zap.Error(err),
		)
		return nil, status.Errorf(codes.Internal, "query failed: %v", err)
	}

	return &dalv1.QueryResponse{
		Records:   result.Records,
		Total:     result.Total,
		FromCache: result.FromCache,
	}, nil
}

// Write handles synchronous create/update/delete requests.
func (s *GRPCServer) Write(ctx context.Context, req *dalv1.WriteRequest) (*dalv1.WriteResponse, error) {
	if req.Service == "" || req.Entity == "" || req.Operation == "" {
		return nil, status.Error(codes.InvalidArgument, "service, entity, and operation are required")
	}

	result, err := s.write.Execute(ctx, req.Service, req.Entity, req.Operation, req.Payload)
	if err != nil {
		s.logger.Error("write failed",
			zap.String("service", req.Service),
			zap.String("entity", req.Entity),
			zap.String("operation", req.Operation),
			zap.Error(err),
		)
		return nil, status.Errorf(codes.Internal, "write failed: %v", err)
	}

	// Emit event on successful write
	if result.Success && s.pipeline != nil {
		go func() {
			emitCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := s.pipeline.EmitEvent(emitCtx, req.Service, req.Entity, req.Operation, req.Payload); err != nil {
				s.logger.Warn("event emission failed", zap.Error(err))
			}
		}()
	}

	return &dalv1.WriteResponse{
		Id:      result.ID,
		Success: result.Success,
		Error:   result.Error,
	}, nil
}

// Check returns health status of all database pools + Redis.
func (s *GRPCServer) Check(ctx context.Context, req *dalv1.CheckRequest) (*dalv1.CheckResponse, error) {
	details := s.pools.HealthCheck(ctx)

	// Add Redis health
	if s.cache != nil {
		details["redis"] = s.cache.HealthCheck(ctx)
	}

	// Determine overall status
	overall := dalv1.CheckResponse_SERVING_STATUS_SERVING
	for _, v := range details {
		if strings.HasPrefix(v, "unhealthy") {
			overall = dalv1.CheckResponse_SERVING_STATUS_NOT_SERVING
			break
		}
	}

	return &dalv1.CheckResponse{
		Status:  overall,
		Details: details,
	}, nil
}

// BatchWrite processes a bidirectional stream of write requests.
func (s *GRPCServer) BatchWrite(bwStream dalv1.DataAccessService_BatchWriteServer) error {
	for {
		req, err := bwStream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return status.Errorf(codes.Internal, "recv error: %v", err)
		}

		result, err := s.write.Execute(bwStream.Context(), req.Service, req.Entity, req.Operation, req.Payload)
		if err != nil {
			if sendErr := bwStream.Send(&dalv1.BatchWriteResponse{
				Success: false,
				Error:   err.Error(),
			}); sendErr != nil {
				return sendErr
			}
			continue
		}

		// Emit event
		if result.Success && s.pipeline != nil {
			go func() {
				emitCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				s.pipeline.EmitEvent(emitCtx, req.Service, req.Entity, req.Operation, req.Payload)
			}()
		}

		if err := bwStream.Send(&dalv1.BatchWriteResponse{
			Id:      result.ID,
			Success: result.Success,
			Error:   result.Error,
		}); err != nil {
			return err
		}
	}
}

// Subscribe streams entity change events to the client.
func (s *GRPCServer) Subscribe(req *dalv1.SubscribeRequest, subStream dalv1.DataAccessService_SubscribeServer) error {
	if req.Service == "" || req.Entity == "" {
		return status.Error(codes.InvalidArgument, "service and entity are required")
	}

	ch, err := s.pipeline.Subscribe(subStream.Context(), req.Service, req.Entity)
	if err != nil {
		return status.Errorf(codes.Internal, "subscribe failed: %v", err)
	}

	for event := range ch {
		if err := subStream.Send(&dalv1.SubscribeResponse{
			EventId:   event.EventID,
			Entity:    event.Entity,
			Operation: event.Operation,
			Payload:   event.Payload,
			Timestamp: event.Timestamp,
			Metadata:  event.Metadata,
		}); err != nil {
			return err
		}
	}

	return nil
}

// IngestStream processes a bidirectional stream with buffered batch flushing.
func (s *GRPCServer) IngestStream(isStream dalv1.DataAccessService_IngestStreamServer) error {
	const (
		bufferSize    = 100
		flushInterval = 500 * time.Millisecond
	)

	type item struct {
		req *dalv1.IngestStreamRequest
	}

	buffer := make([]item, 0, bufferSize)
	ticker := time.NewTicker(flushInterval)
	defer ticker.Stop()

	flush := func() {
		if len(buffer) == 0 {
			return
		}
		for _, it := range buffer {
			req := it.req
			result, err := s.write.Execute(isStream.Context(), req.Service, req.Entity, req.Operation, req.Payload)
			if err != nil {
				isStream.Send(&dalv1.IngestStreamResponse{Success: false, Error: err.Error()})
				continue
			}

			if result.Success && s.pipeline != nil {
				go func(svc, ent, op string, payload []byte) {
					emitCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancel()
					s.pipeline.EmitEvent(emitCtx, svc, ent, op, payload)
				}(req.Service, req.Entity, req.Operation, req.Payload)
			}

			isStream.Send(&dalv1.IngestStreamResponse{
				Id:      result.ID,
				Success: result.Success,
				Error:   result.Error,
			})
		}
		buffer = buffer[:0]
	}

	// Read loop with periodic flush
	recvCh := make(chan *dalv1.IngestStreamRequest, bufferSize)
	errCh := make(chan error, 1)

	go func() {
		for {
			req, err := isStream.Recv()
			if err != nil {
				errCh <- err
				return
			}
			recvCh <- req
		}
	}()

	for {
		select {
		case req, ok := <-recvCh:
			if !ok {
				flush()
				return nil
			}
			buffer = append(buffer, item{req: req})
			if len(buffer) >= bufferSize {
				flush()
			}
		case <-ticker.C:
			flush()
		case err := <-errCh:
			flush()
			if err == io.EOF {
				return nil
			}
			return status.Errorf(codes.Internal, "recv error: %v", err)
		case <-isStream.Context().Done():
			flush()
			return nil
		}
	}
}
