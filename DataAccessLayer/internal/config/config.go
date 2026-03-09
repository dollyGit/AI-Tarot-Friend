// Package config — DAL configuration loaded from environment variables.
package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

// Config holds all DAL configuration.
type Config struct {
	// gRPC server
	GRPCPort    string
	MetricsPort string
	Env         string

	// PostgreSQL databases (one pool per service)
	Databases map[string]DBConfig

	// Redis
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// Kafka
	KafkaBrokers []string

	// OpenTelemetry
	OTLPEndpoint string

	// MongoDB
	MongoDB *MongoConfig

	// InfluxDB
	InfluxDB *InfluxConfig

	// Qdrant (vector)
	Qdrant *QdrantConfig

	// Neo4j (graph)
	Neo4j *Neo4jConfig

	// Cache
	CacheConfig *CacheConfig
}

// MongoConfig holds MongoDB connection settings.
type MongoConfig struct {
	URI      string // e.g. "mongodb://localhost:27017"
	Database string // e.g. "tarot_docs"
}

// InfluxConfig holds InfluxDB v2 connection settings.
type InfluxConfig struct {
	URL    string // e.g. "http://localhost:8086"
	Token  string
	Org    string
	Bucket string
}

// QdrantConfig holds Qdrant connection settings.
type QdrantConfig struct {
	Addr   string // e.g. "localhost:6334" (gRPC port)
	APIKey string // optional
}

// Neo4jConfig holds Neo4j connection settings.
type Neo4jConfig struct {
	URI      string // e.g. "bolt://localhost:7687"
	Username string
	Password string
}

// DBConfig holds a single database pool configuration.
type DBConfig struct {
	URL      string
	MaxConns int32
}

// CacheConfig is the per-entity cache strategy config.
type CacheConfig struct {
	Entities map[string]EntityCacheConfig `yaml:"entities"`
}

// EntityCacheConfig defines cache strategy for a single entity.
type EntityCacheConfig struct {
	Strategy      string        `yaml:"strategy"`       // read_through | write_through | write_behind
	TTL           time.Duration `yaml:"ttl"`            // parsed from "10m", "2h", etc.
	FlushInterval time.Duration `yaml:"flush_interval"` // for write_behind only
}

// Load reads configuration from environment variables and cache config file.
func Load() (*Config, error) {
	cfg := &Config{
		GRPCPort:    getEnv("PORT", "4000"),
		MetricsPort: getEnv("METRICS_PORT", "4001"),
		Env:         getEnv("ENV", "development"),

		Databases: map[string]DBConfig{
			"tarot": {
				URL:      getEnv("TAROT_DB_URL", "postgresql://postgres:postgres@localhost:5432/tarot_db"),
				MaxConns: getEnvInt32("TAROT_DB_MAX_CONNS", 20),
			},
			"customer": {
				URL:      getEnv("CUSTOMER_DB_URL", "postgresql://postgres:postgres@localhost:5432/customer_db"),
				MaxConns: getEnvInt32("CUSTOMER_DB_MAX_CONNS", 30),
			},
			"caring": {
				URL:      getEnv("CARING_DB_URL", "postgresql://postgres:postgres@localhost:5432/caring_db"),
				MaxConns: getEnvInt32("CARING_DB_MAX_CONNS", 15),
			},
			"shop": {
				URL:      getEnv("SHOP_DB_URL", "postgresql://postgres:postgres@localhost:5432/shop_db"),
				MaxConns: getEnvInt32("SHOP_DB_MAX_CONNS", 10),
			},
			"scheduler": {
				URL:      getEnv("SCHEDULER_DB_URL", "postgresql://postgres:postgres@localhost:5432/scheduler_db"),
				MaxConns: getEnvInt32("SCHEDULER_DB_MAX_CONNS", 15),
			},
		},

		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       int(getEnvInt32("REDIS_DB", 0)),

		KafkaBrokers: splitEnv("KAFKA_BROKERS", "localhost:9092"),

		OTLPEndpoint: getEnv("OTLP_ENDPOINT", "localhost:4318"),

		// MongoDB (optional — only used when entities route to it)
		MongoDB: &MongoConfig{
			URI:      getEnv("MONGO_URI", "mongodb://localhost:27017"),
			Database: getEnv("MONGO_DB", "tarot_docs"),
		},

		// InfluxDB (optional)
		InfluxDB: &InfluxConfig{
			URL:    getEnv("INFLUX_URL", "http://localhost:8086"),
			Token:  getEnv("INFLUX_TOKEN", ""),
			Org:    getEnv("INFLUX_ORG", "tarotfriend"),
			Bucket: getEnv("INFLUX_BUCKET", "tarot_metrics"),
		},

		// Qdrant (optional)
		Qdrant: &QdrantConfig{
			Addr:   getEnv("QDRANT_ADDR", "localhost:6334"),
			APIKey: getEnv("QDRANT_API_KEY", ""),
		},

		// Neo4j (optional)
		Neo4j: &Neo4jConfig{
			URI:      getEnv("NEO4J_URI", "bolt://localhost:7687"),
			Username: getEnv("NEO4J_USER", "neo4j"),
			Password: getEnv("NEO4J_PASSWORD", "neo4j"),
		},
	}

	// Load cache config
	cacheConfigPath := getEnv("CACHE_CONFIG_PATH", "configs/cache_config.yaml")
	cacheConfig, err := loadCacheConfig(cacheConfigPath)
	if err != nil {
		return nil, fmt.Errorf("loading cache config: %w", err)
	}
	cfg.CacheConfig = cacheConfig

	return cfg, nil
}

func loadCacheConfig(path string) (*CacheConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}

	// Intermediate struct for YAML parsing (TTL as string)
	type rawEntity struct {
		Strategy      string `yaml:"strategy"`
		TTL           string `yaml:"ttl"`
		FlushInterval string `yaml:"flush_interval"`
	}
	type rawConfig struct {
		Entities map[string]rawEntity `yaml:"entities"`
	}

	var raw rawConfig
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", path, err)
	}

	cfg := &CacheConfig{
		Entities: make(map[string]EntityCacheConfig, len(raw.Entities)),
	}
	for name, re := range raw.Entities {
		ttl, err := time.ParseDuration(re.TTL)
		if err != nil {
			return nil, fmt.Errorf("invalid TTL %q for entity %q: %w", re.TTL, name, err)
		}

		var flushInterval time.Duration
		if re.FlushInterval != "" {
			flushInterval, err = time.ParseDuration(re.FlushInterval)
			if err != nil {
				return nil, fmt.Errorf("invalid flush_interval %q for entity %q: %w", re.FlushInterval, name, err)
			}
		}

		cfg.Entities[name] = EntityCacheConfig{
			Strategy:      re.Strategy,
			TTL:           ttl,
			FlushInterval: flushInterval,
		}
	}

	return cfg, nil
}

// ── Helpers ────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt32(key string, fallback int32) int32 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	var n int32
	_, err := fmt.Sscanf(v, "%d", &n)
	if err != nil {
		return fallback
	}
	return n
}

func splitEnv(key, fallback string) []string {
	v := getEnv(key, fallback)
	if v == "" {
		return nil
	}
	var parts []string
	for _, p := range splitString(v, ',') {
		p = trimSpace(p)
		if p != "" {
			parts = append(parts, p)
		}
	}
	return parts
}

func splitString(s string, sep byte) []string {
	var parts []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == sep {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
