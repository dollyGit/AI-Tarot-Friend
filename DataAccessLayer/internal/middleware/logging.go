// Package middleware — gRPC interceptors for logging, tracing, metrics, and auth.
package middleware

import (
	"context"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/status"
)

// LoggingUnaryInterceptor logs gRPC unary calls with structured fields.
func LoggingUnaryInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		resp, err := handler(ctx, req)

		duration := time.Since(start)
		st, _ := status.FromError(err)

		fields := []zap.Field{
			zap.String("method", info.FullMethod),
			zap.String("status", st.Code().String()),
			zap.Duration("duration", duration),
		}

		if err != nil {
			logger.Warn("gRPC call failed", append(fields, zap.Error(err))...)
		} else {
			logger.Info("gRPC call", fields...)
		}

		return resp, err
	}
}

// LoggingStreamInterceptor logs gRPC stream lifecycle.
func LoggingStreamInterceptor(logger *zap.Logger) grpc.StreamServerInterceptor {
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		start := time.Now()
		logger.Info("gRPC stream opened", zap.String("method", info.FullMethod))

		err := handler(srv, ss)

		duration := time.Since(start)
		st, _ := status.FromError(err)

		logger.Info("gRPC stream closed",
			zap.String("method", info.FullMethod),
			zap.String("status", st.Code().String()),
			zap.Duration("duration", duration),
		)

		return err
	}
}
