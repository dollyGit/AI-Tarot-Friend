// Package main — TarotFriend Data Access Layer (gRPC Server)
//
// Unified data gateway routing to PostgreSQL databases.
// Port: 4000 (gRPC), 4001 (metrics/health HTTP)
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/tarotfriend/data-access-layer/internal/cache"
	"github.com/tarotfriend/data-access-layer/internal/config"
	"github.com/tarotfriend/data-access-layer/internal/middleware"
	"github.com/tarotfriend/data-access-layer/internal/server"
	"github.com/tarotfriend/data-access-layer/internal/service"
	"github.com/tarotfriend/data-access-layer/internal/storage"
	"github.com/tarotfriend/data-access-layer/internal/stream"

	dalv1 "github.com/tarotfriend/data-access-layer/pkg/proto/dal/v1"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	var logger *zap.Logger
	if cfg.Env == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		log.Fatalf("Failed to create logger: %v", err)
	}
	defer logger.Sync()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Initialize OpenTelemetry tracer
	shutdown, err := middleware.InitTracer(ctx, cfg.OTLPEndpoint, logger)
	if err != nil {
		logger.Warn("failed to init tracer, continuing without tracing", zap.Error(err))
	} else {
		defer shutdown(ctx)
	}

	// Initialize database pools
	pools, err := storage.NewPoolManager(ctx, cfg.Databases, logger)
	if err != nil {
		logger.Fatal("failed to create pool manager", zap.Error(err))
	}
	defer pools.Close()

	// Initialize Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	defer redisClient.Close()

	// Initialize cache manager
	cacheManager := cache.NewManager(redisClient, cfg.CacheConfig, logger)
	defer cacheManager.Close()

	// Initialize streaming pipeline
	pipeline := stream.NewPipeline(redisClient, cfg.KafkaBrokers, logger)
	defer pipeline.Close()

	// Build storage router
	router := storage.NewRouter(pools)

	// Build service layer
	queryService := service.NewQueryService(router, cacheManager, logger)
	writeService := service.NewWriteService(router, cacheManager, logger)

	// Build gRPC server with middleware chain
	grpcServer := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			middleware.MetricsUnaryInterceptor(),
			middleware.LoggingUnaryInterceptor(logger),
			middleware.AuthUnaryInterceptor(logger),
		),
		grpc.ChainStreamInterceptor(
			middleware.MetricsStreamInterceptor(),
			middleware.LoggingStreamInterceptor(logger),
			middleware.AuthStreamInterceptor(logger),
		),
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	)

	dalServer := server.NewGRPCServer(queryService, writeService, pools, cacheManager, pipeline, logger)
	dalv1.RegisterDataAccessServiceServer(grpcServer, dalServer)

	// Register gRPC health check (standard protocol)
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, healthServer)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	healthServer.SetServingStatus("dal.v1.DataAccessService", healthpb.HealthCheckResponse_SERVING)

	// Enable gRPC reflection (for grpcurl in dev)
	reflection.Register(grpcServer)

	// Start HTTP server for metrics + health
	metricsAddr := fmt.Sprintf(":%s", cfg.MetricsPort)
	httpMux := http.NewServeMux()
	httpMux.Handle("/metrics", promhttp.Handler())
	httpMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		details := pools.HealthCheck(r.Context())
		details["redis"] = cacheManager.HealthCheck(r.Context())

		healthy := true
		for _, v := range details {
			if len(v) > 9 && v[:9] == "unhealthy" {
				healthy = false
				break
			}
		}

		resp := map[string]interface{}{
			"status":  "healthy",
			"details": details,
		}
		if !healthy {
			resp["status"] = "unhealthy"
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	httpServer := &http.Server{Addr: metricsAddr, Handler: httpMux}
	go func() {
		logger.Info("HTTP metrics/health server starting", zap.String("addr", metricsAddr))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Warn("HTTP server error", zap.Error(err))
		}
	}()

	// Start gRPC server
	grpcAddr := fmt.Sprintf(":%s", cfg.GRPCPort)
	lis, err := net.Listen("tcp", grpcAddr)
	if err != nil {
		logger.Fatal("failed to listen", zap.String("addr", grpcAddr), zap.Error(err))
	}

	logger.Info("DAL gRPC server starting",
		zap.String("grpc_addr", grpcAddr),
		zap.String("metrics_addr", metricsAddr),
		zap.String("env", cfg.Env),
	)

	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			logger.Fatal("gRPC serve error", zap.Error(err))
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down DAL server...")
	grpcServer.GracefulStop()
	httpServer.Shutdown(context.Background())
	logger.Info("DAL server stopped")
}
