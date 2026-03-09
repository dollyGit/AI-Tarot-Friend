package middleware

import (
	"context"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/status"
)

var (
	grpcRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "dal_grpc_requests_total",
		Help: "Total gRPC requests by method and status",
	}, []string{"method", "status"})

	grpcRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "dal_grpc_request_duration_seconds",
		Help:    "gRPC request latency distribution",
		Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5},
	}, []string{"method"})

	CacheHitsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "dal_cache_hits_total",
		Help: "Total cache hits by service and entity",
	}, []string{"service", "entity"})

	CacheMissesTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "dal_cache_misses_total",
		Help: "Total cache misses by service and entity",
	}, []string{"service", "entity"})

	KafkaProduceTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "dal_kafka_produce_total",
		Help: "Total Kafka messages produced by topic and status",
	}, []string{"topic", "status"})
)

// MetricsUnaryInterceptor records Prometheus metrics for unary RPCs.
func MetricsUnaryInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		resp, err := handler(ctx, req)

		duration := time.Since(start)
		st, _ := status.FromError(err)

		grpcRequestsTotal.WithLabelValues(info.FullMethod, st.Code().String()).Inc()
		grpcRequestDuration.WithLabelValues(info.FullMethod).Observe(duration.Seconds())

		return resp, err
	}
}

// MetricsStreamInterceptor records Prometheus metrics for streaming RPCs.
func MetricsStreamInterceptor() grpc.StreamServerInterceptor {
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		start := time.Now()

		err := handler(srv, ss)

		duration := time.Since(start)
		st, _ := status.FromError(err)

		grpcRequestsTotal.WithLabelValues(info.FullMethod, st.Code().String()).Inc()
		grpcRequestDuration.WithLabelValues(info.FullMethod).Observe(duration.Seconds())

		return err
	}
}
