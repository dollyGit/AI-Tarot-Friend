// Package main — TarotFriend Data Access Layer (gRPC Server)
//
// Unified polyglot data gateway routing to PostgreSQL, MongoDB,
// InfluxDB, Qdrant, and Neo4j storage engines.
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

	// Build storage router and register per-service PostgresBackends
	router := storage.NewRouter(pools, logger)
	for svc := range cfg.Databases {
		pool, err := pools.Pool(svc)
		if err != nil {
			logger.Fatal("failed to get pool for postgres backend", zap.String("service", svc), zap.Error(err))
		}
		router.RegisterPostgresBackend(svc, storage.NewPostgresBackend(pool, logger))
	}

	// ── Initialize non-postgres backends ─────────────────────
	// MongoDB
	if cfg.MongoDB != nil {
		mongoBackend, err := storage.NewMongoBackend(ctx, cfg.MongoDB.URI, cfg.MongoDB.Database, logger)
		if err != nil {
			logger.Warn("MongoDB backend unavailable, document entities will fail", zap.Error(err))
		} else {
			defer mongoBackend.Close()
			router.RegisterBackend(storage.EngineMongo, mongoBackend)

			// Register MongoDB entities
			router.RegisterEntity("customer", "visit_logs", storage.EngineMongo, "visit_logs")
			router.RegisterEntity("customer", "activity_events", storage.EngineMongo, "activity_events")
			router.RegisterEntity("customer", "divination_charts", storage.EngineMongo, "divination_charts")
			router.RegisterEntity("customer", "conversation_raw", storage.EngineMongo, "conversation_raw")
			router.RegisterEntity("customer", "customer_behavior_profile", storage.EngineMongo, "customer_behavior_profile")
		}
	}

	// InfluxDB
	if cfg.InfluxDB != nil {
		influxBackend, err := storage.NewInfluxBackend(ctx, cfg.InfluxDB.URL, cfg.InfluxDB.Token, cfg.InfluxDB.Org, cfg.InfluxDB.Bucket, logger)
		if err != nil {
			logger.Warn("InfluxDB backend unavailable, timeseries entities will fail", zap.Error(err))
		} else {
			defer influxBackend.Close()
			router.RegisterBackend(storage.EngineInflux, influxBackend)

			// Register InfluxDB entities
			router.RegisterEntity("customer", "customer_engagement", storage.EngineInflux, "customer_engagement")
			router.RegisterEntity("customer", "customer_spending", storage.EngineInflux, "customer_spending")
			router.RegisterEntity("customer", "customer_sentiment", storage.EngineInflux, "customer_sentiment")
			router.RegisterEntity("customer", "system_session_gauge", storage.EngineInflux, "system_session_gauge")
		}
	}

	// Qdrant
	if cfg.Qdrant != nil {
		qdrantBackend, err := storage.NewQdrantBackend(ctx, cfg.Qdrant.Addr, logger)
		if err != nil {
			logger.Warn("Qdrant backend unavailable, vector entities will fail", zap.Error(err))
		} else {
			defer qdrantBackend.Close()
			router.RegisterBackend(storage.EngineQdrant, qdrantBackend)

			// Register Qdrant entities
			router.RegisterEntity("customer", "conversation_summaries", storage.EngineQdrant, "conversation-summaries")
			router.RegisterEntity("customer", "long_term_memory", storage.EngineQdrant, "long-term-memory")
		}
	}

	// Neo4j
	if cfg.Neo4j != nil {
		neo4jBackend, err := storage.NewNeo4jBackend(ctx, cfg.Neo4j.URI, cfg.Neo4j.Username, cfg.Neo4j.Password, logger)
		if err != nil {
			logger.Warn("Neo4j backend unavailable, graph entities will fail", zap.Error(err))
		} else {
			defer neo4jBackend.Close()
			router.RegisterBackend(storage.EngineNeo4j, neo4jBackend)

			// Register Neo4j entities
			router.RegisterEntity("customer", "relationship_graph", storage.EngineNeo4j, "Customer")
			router.RegisterEntity("customer", "knowledge_graph", storage.EngineNeo4j, "Topic")
		}
	}

	// Build service layer
	queryService := service.NewQueryService(router, cacheManager, logger)
	writeService := service.NewWriteService(router, cacheManager, logger)
	customerViewService := service.NewCustomerViewService(router, cacheManager, queryService, logger)

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

	// ── GetCustomerView REST endpoint (P3.5) ─────────────
	// Exposes the cross-engine aggregation as HTTP since proto stubs aren't
	// regenerated yet. Will be served via gRPC once protoc runs.
	httpMux.HandleFunc("GET /api/v1/customers/{id}/view", func(w http.ResponseWriter, r *http.Request) {
		customerID := r.PathValue("id")
		if customerID == "" {
			http.Error(w, `{"error":"customer_id is required"}`, http.StatusBadRequest)
			return
		}

		view, err := customerViewService.GetFullView(r.Context(), customerID)
		if err != nil {
			logger.Error("GetFullView failed", zap.String("customer_id", customerID), zap.Error(err))
			http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(view)
	})

	httpMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		details := pools.HealthCheck(r.Context())
		details["redis"] = cacheManager.HealthCheck(r.Context())

		// Check non-postgres backends
		for engine, backend := range router.Backends() {
			if err := backend.Ping(r.Context()); err != nil {
				details[string(engine)] = fmt.Sprintf("unhealthy: %v", err)
			} else {
				details[string(engine)] = "healthy"
			}
		}

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
