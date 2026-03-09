# Architecture Patterns — DAL & Service Design

## DAL gRPC Proto Definition

```protobuf
service DataAccess {
  // Synchronous CRUD
  rpc Query(QueryRequest) returns (QueryResponse);
  rpc Write(WriteRequest) returns (WriteResponse);

  // Streaming
  rpc BatchWrite(stream WriteRequest) returns (stream WriteResponse);  // bidirectional
  rpc Subscribe(SubscribeRequest) returns (stream ChangeEvent);        // server-streaming
  rpc IngestStream(stream IngestRecord) returns (IngestSummary);       // client-streaming
}

message QueryRequest {
  string service = 1;        // "customer", "tarot", "caring", etc.
  string entity = 2;         // "profile", "card", "session", etc.
  string id = 3;             // entity ID (UUID)
  CachePolicy cache = 4;     // CACHE_FIRST, SKIP_CACHE, REFRESH
  map<string, string> filters = 5;
  Pagination pagination = 6;
}

message WriteRequest {
  string service = 1;
  string entity = 2;
  string id = 3;
  WriteStrategy strategy = 4; // WRITE_THROUGH, WRITE_BEHIND, WRITE_THROUGH_SYNC
  bytes payload = 5;          // JSON-encoded entity data
  string correlation_id = 6;
}
```

## Cache Strategy Decision Matrix

| Data Type | Strategy | TTL | Invalidation Trigger |
|-----------|----------|-----|---------------------|
| Customer Profile | Read-Through | 10min | customer.updated event |
| Card Definitions | Read-Through | 24hr | Manual seed update |
| Crystal Metadata | Read-Through | 5min | product.synced event |
| Tarotist Profile | Read-Through | 15min | tarotist.updated event |
| Availability Slots | Read-Through | 2min | availability.changed event |
| Recommendation Cache | Cache-Aside | 10min | customer profile change |
| Visit Logs | Write-Behind | 1s batch | N/A (append-only) |
| Activity Events | Write-Behind | 500ms batch | N/A (append-only) |
| Metrics (InfluxDB) | Write-Behind | 500ms batch | N/A (append-only) |
| Financial Records | Write-Through | N/A | Immediate (ACID required) |
| Consent Changes | Write-Through | N/A | Immediate (legal requirement) |

## Redis Key Naming Convention

```
dal:cache:{service}:{entity}:{id}           — Entity cache
dal:cache:customer:profile:a1b2c3d4         — Customer profile
dal:cache:tarot:card:42                     — Tarot card #42
dal:cache:tarot:spread:celtic-cross         — Spread definition
dal:lock:{service}:{entity}:{id}            — Distributed lock
dal:stream:{service}:{topic}                — Redis Stream
dal:invalidate:{service}                    — Invalidation channel (Pub/Sub)
```

## Storage Router Logic

The DAL Storage Router determines which storage engine handles each request:

```
Request arrives → Extract (service, entity)
  ↓
Route table lookup:
  customer:profile      → PostgreSQL (customer_db)
  customer:contact      → PostgreSQL (customer_db)
  customer:finance      → PostgreSQL (customer_db) [Write-Through only]
  customer:visit        → MongoDB (customer_activity_db)
  customer:behavior     → MongoDB (customer_activity_db)
  customer:chart        → MongoDB (customer_activity_db)
  customer:conversation → MongoDB (customer_activity_db)
  customer:session      → Redis
  customer:presence     → Redis
  customer:working_mem  → Redis
  customer:engagement   → InfluxDB
  customer:spending     → InfluxDB
  customer:sentiment_ts → InfluxDB
  customer:summary_vec  → Qdrant (conversation_summaries)
  customer:longterm_vec → Qdrant (long_term_memory)
  customer:graph        → Neo4j
  tarot:card            → PostgreSQL (tarot_db)
  tarot:spread          → PostgreSQL (tarot_db)
  tarot:draw            → PostgreSQL (tarot_db)
  caring:plan           → PostgreSQL (caring_db)
  caring:action         → PostgreSQL (caring_db)
  caring:rule           → PostgreSQL (caring_db)
  shop:customer_map     → PostgreSQL (shop_db)
  shop:webhook_log      → PostgreSQL (shop_db)
  scheduler:tarotist    → PostgreSQL (scheduler_db)
  scheduler:appointment → PostgreSQL (scheduler_db)
```

## Connection Pool Configuration

| Database | Pool Size | Min Idle | Max Lifetime |
|----------|-----------|----------|-------------|
| PostgreSQL (per service DB) | 20 | 5 | 30min |
| MongoDB | 10 | 2 | 10min |
| Redis | 50 (shared) | 10 | N/A |
| InfluxDB | 5 | 1 | 5min |
| Qdrant | 10 | 2 | 10min |
| Neo4j | 20 | 5 | 30min |

## Stream Pipeline Design

### Mode A — Redis Streams (< 1ms sync)

Used for: Cache invalidation, real-time presence, working memory updates

```
Service writes entity → DAL Write → Cache updated → Redis XADD to stream
  → Other DAL instances consume → Invalidate local cache
```

### Mode B — Kafka (persistent events)

Used for: Cross-service events, audit trail, replay capability

```
Service writes entity → DAL Write → Kafka produce → Multiple consumers
  → CaringService, CustomerMgmt, etc. each process independently
```

### Decision: Mode A vs Mode B

| Factor | Mode A (Redis Streams) | Mode B (Kafka) |
|--------|----------------------|----------------|
| Latency | < 1ms | 10-100ms |
| Durability | In-memory (can lose on crash) | Disk-persistent, replayable |
| Consumers | Single consumer group typical | Multiple consumer groups |
| Ordering | Per-stream guarantee | Per-partition guarantee |
| Use when | Cache sync, real-time UI | Business events, audit, analytics |

## Circuit Breaker Pattern

All inter-service REST calls must implement:

```typescript
// Configuration
const circuitBreaker = {
  timeout: 3000,          // 3s request timeout
  errorThreshold: 5,      // Open after 5 failures
  resetTimeout: 30000,    // Try again after 30s
  halfOpenRequests: 1,    // Allow 1 test request in half-open
};
```

States: CLOSED (normal) → OPEN (all requests fail-fast) → HALF-OPEN (test one request) → CLOSED
