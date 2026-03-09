---
name: technical-expert
description: >
  TarotFriend 全端技術架構專家。審查微服務設計、多資料庫優化（PostgreSQL, MongoDB, Redis, InfluxDB,
  Qdrant, Neo4j）、gRPC + Kafka 事件驅動架構、Shopify Headless Commerce、Docker/Kubernetes 基礎設施、
  CI/CD、安全審計、效能優化、成本分析。當工作涉及 ARCHITECTURE.md、WBS.md、DAL、跨服務系統設計、
  資料庫 schema、基礎設施配置、部署流程時，務必使用此技能。
  Full-stack architecture expert for TarotFriend. Use for microservice design, multi-database optimization,
  gRPC + Kafka event-driven architecture, Shopify Headless Commerce, Docker/Kubernetes infrastructure,
  CI/CD pipeline, security auditing, performance optimization, and cost analysis. Always invoke when working
  on cross-service system design, database schemas, infrastructure configs, or deployment pipelines.
---

# Technical Expert — TarotFriend 技術架構專家

## When to Use

Invoke this skill when:
- Designing or reviewing microservice architecture
- Adding a new service to the platform
- Designing database schemas across any of the 6 storage engines
- Reviewing or optimizing performance (query speed, caching, connection pools)
- Auditing security (authentication, authorization, data encryption, PII handling)
- Working with Shopify Headless integration
- Configuring infrastructure (Docker, Kubernetes, CI/CD)
- Estimating or optimizing costs (compute, storage, AI token usage)
- Reviewing cross-service event flows (Kafka topics, Redis Pub/Sub)
- Making technology selection decisions

---

## TarotFriend Architecture Overview

### Microservice Topology

| Service | Tech | Port | Status | Database |
|---------|------|------|--------|----------|
| **TarotReading** | Node.js + Express + TypeScript + Prisma | 3000 | MVP Complete | `tarot_db` (PostgreSQL + pgvector) |
| **CustomerManagement** | Node.js + Express + TypeScript + Prisma | 3010 | Schema Design | `customer_db` (6-storage model) |
| **CaringService** | Python + FastAPI | 3020 | Schema Design | `caring_db` (PostgreSQL) |
| **ShoppingCart** | Node.js + Express + TypeScript | 3030 | Schema Design | `shop_db` (2 tables only) |
| **TarotistScheduler** | Node.js + Express + TypeScript + Prisma | 3040 | Not Started | `scheduler_db` (PostgreSQL) |
| **DataAccessLayer (DAL)** | Go + gRPC | 4000 | Not Started | Routes to all storage engines |

### System Diagram

```
                    API Gateway (Kong/Nginx)
                           │
    ┌──────────┬───────────┼──────────┬──────────────┐
    ▼          ▼           ▼          ▼              ▼
TarotReading CustomerMgmt CaringSvc ShoppingCart Scheduler
  :3000       :3010       :3020      :3030        :3040
    └──────────┴───────────┼──────────┴──────────────┘
                           ▼
              DataAccessLayer (Go gRPC) :4000
              ┌──────────────────────────────┐
              │ gRPC API │ Stream Engine      │
              │ Cache Manager (3 strategies)  │
              │ Storage Router + Pool Manager │
              └──────────────┬───────────────┘
    ┌────────┬───────┬───────┼──────┬────────┬────────┐
    ▼        ▼       ▼       ▼      ▼        ▼        ▼
PostgreSQL MongoDB  Redis InfluxDB Qdrant   Neo4j   Per-svc DBs
```

### Key File References

- Full architecture: `/Users/martinlee/Projects/TarotFriend/ARCHITECTURE.md` (66KB)
- Customer schema: `/Users/martinlee/Projects/TarotFriend/CustomerManagement/CUSTOMER_SCHEMA.md`
- Shopify design: `/Users/martinlee/Projects/TarotFriend/ShoppingCart/SHOPIFY_INTEGRATION.md`
- Work breakdown: `/Users/martinlee/Projects/TarotFriend/WBS.md` (8 phases, 53 tasks)
- Existing backend: `/Users/martinlee/Projects/TarotFriend/TarotReading/backend/src/`

For deeper dives, read the `references/` files in this skill directory.

---

## Multi-Database Decision Matrix

Choose the right storage engine based on data characteristics:

| Criterion | PostgreSQL | MongoDB | Redis | InfluxDB | Qdrant | Neo4j |
|-----------|-----------|---------|-------|----------|--------|-------|
| **Use when** | ACID needed, relational joins, financial data | Flexible schema, high-write, polymorphic docs | Sub-ms reads, ephemeral state, counters | Time-indexed metrics, append-only, downsampling | Semantic similarity, embedding search, RAG | Relationship traversal, pattern matching |
| **TarotFriend data** | Customer profiles, finance, consent, cards | Visit logs, divination charts, conversations | Sessions, working memory, presence, rate limits | Engagement, spending, sentiment time-series | Conversation summaries, long-term memory | People network, entity graph, crystal recs |
| **Write pattern** | Low-medium, transactional | High-frequency, batch | Very high, ephemeral | Append-only, batch flush | Batch upsert after LLM | Edge creation on events |
| **Read pattern** | Complex JOINs | Doc by ID + range | Key lookup < 1ms | Aggregation windows | ANN vector search | Graph traversal (N-hop) |
| **Consistency** | Strong (ACID) | Eventual | Eventual | Eventual | Eventual | ACID per transaction |
| **Retention** | Permanent | TTL per collection (3yr conversations) | TTL per key (30min sessions) | Tiered: raw 90d → hourly 1y → daily 3y | Permanent (with decay scoring) | Permanent |

---

## Service Communication Patterns

### Synchronous (REST) — For immediate responses

- Base URL: `http://{service-name}:{port}/internal/v1/`
- `/internal/` paths blocked by API Gateway from external access
- Authentication: Service JWT tokens (issuer: `service-{name}`)
- Timeout: 3 seconds with circuit breaker
- Use cases: Query customer preferences during reading, check member discounts at checkout, query tarotist availability

### Asynchronous (Kafka) — For event-driven workflows

| Event | Producer | Consumer(s) |
|-------|----------|-------------|
| `customer.created` | CustomerMgmt | CaringService |
| `customer.updated` | CustomerMgmt | All services |
| `reading.completed` | TarotReading | CaringService, CustomerMgmt |
| `order.placed` | ShoppingCart | CustomerMgmt, CaringService |
| `order.shipped` | ShoppingCart | CustomerMgmt |
| `appointment.booked` | Scheduler | CustomerMgmt, CaringService |
| `appointment.completed` | Scheduler | CaringService |
| `caring.action_triggered` | CaringService | TarotReading (LINE), CustomerMgmt |
| `sentiment.alert` | CaringService | TarotReading |

**Event Schema Standard**:
```json
{
  "event_id": "uuid",
  "event_type": "reading.completed",
  "correlation_id": "uuid (trace across services)",
  "timestamp": "ISO8601",
  "source": "tarot-reading",
  "payload": { ... }
}
```

### Decision Criteria

Use **REST** when: Response needed within request lifecycle, data is critical for immediate UX, simple request-response pattern.

Use **Kafka** when: Fire-and-forget is acceptable, multiple consumers need the same event, audit trail needed, eventual consistency is fine.

---

## DAL (Data Access Layer) Design

The Go-based DAL at port 4000 provides universal data access through gRPC:

### gRPC API

| Method | Type | Purpose |
|--------|------|---------|
| `Query` | Unary | CRUD reads with cache policies |
| `Write` | Unary | CRUD writes with write strategies |
| `BatchWrite` | Bidirectional stream | Bulk writes (e.g., event ingestion) |
| `Subscribe` | Server stream | Real-time entity change notifications |
| `IngestStream` | Client stream | High-frequency writes (visit logs, metrics) |

### Cache Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Read-Through** | Check cache first → DB on miss → populate cache | Customer profiles, card definitions |
| **Write-Behind** | Write to cache → async batch flush to DB | Visit logs, activity events, metrics |
| **Write-Through** | Sync write to both cache and DB | Financial records, consent changes |

### Cache TTL Configuration

| Entity | TTL | Strategy |
|--------|-----|----------|
| Customer Profile | 10min | Read-Through |
| Crystal Metadata | 5min | Read-Through |
| Recommendation | 10min | Cache-Aside |
| Tarotist Profile | 15min | Read-Through |
| Availability | 2min | Read-Through |
| Card Definitions | 24hr | Read-Through |
| Visit Logs | flush 1s batch | Write-Behind |
| Events | flush 500ms | Write-Behind |

### Redis Key Convention

```
dal:cache:{service}:{entity}:{id}
dal:cache:customer:profile:uuid-here
dal:cache:tarot:card:42
```

---

## Shopify Headless Integration

**Principle**: Shopify handles commerce (catalog, cart, checkout, payments, inventory). We handle domain logic (crystal recommendations, behavior tracking, Graph DB enrichment).

### Webhook → Kafka Event Mapping

| Shopify Webhook | Internal Event | Kafka Topic |
|----------------|----------------|-------------|
| `orders/create` | ORDER_CREATED | `order.placed` |
| `orders/paid` | ORDER_PAID | `order.paid` |
| `orders/fulfilled` | ORDER_FULFILLED | `order.shipped` |
| `orders/cancelled` | ORDER_CANCELLED | `order.cancelled` |
| `refunds/create` | REFUND_CREATED | `order.refunded` |
| `products/update` | PRODUCT_UPDATED | `product.synced` |
| `products/delete` | PRODUCT_DELETED | `product.removed` |
| `checkouts/create` | CHECKOUT_STARTED | `cart.checkout_started` |

### Crystal Metafields (Product Attributes)

```
crystal.wuxing_element    — 五行屬性 (金/木/水/火/土)
crystal.wuxing_support    — 五行相生 (supporting elements)
crystal.healing_properties — 療癒屬性 (array)
crystal.chakra            — 脈輪對應 (primary)
crystal.chakra_secondary  — 脈輪對應 (secondary)
crystal.zodiac_affinity   — 星座親和 (array)
crystal.emotion_tags      — 情緒標籤 (array)
crystal.mineral_name      — 礦物名稱
crystal.hardness          — 莫氏硬度
crystal.origin            — 產地
```

For detailed Shopify patterns, read `references/shopify-headless.md`.

---

## Performance SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response P95 | < 800ms | Prometheus histogram |
| API response P99 | < 2s | Prometheus histogram |
| Uptime | 99.9% | Health check probes |
| Redis operations | < 1ms | Prometheus histogram |
| GetFullCustomerView | < 500ms | Cross-engine aggregation |
| LLM interpretation | < 5s | InterpretationGenerator timer |
| Error rate | < 0.1% | 4xx + 5xx / total requests |

### Token Budget (Constitution Principle IV: Small Model First)

| Task | Provider | Model | Max Tokens |
|------|----------|-------|------------|
| Interpretation | OpenAI | gpt-4o-mini | 500 |
| Crisis Detection | Anthropic | claude-3-haiku | 300 |
| Summary | OpenAI | gpt-4o-mini | 200 |

Fallback: Primary fails → switch to opposite provider (OpenAI ↔ Anthropic).

---

## Security Checklist

1. **Authentication**: JWT service tokens (issuer: `service-{name}`, expiry: 7d access / 30d refresh)
2. **API Gateway**: Block `/internal/*` from external access
3. **Encryption**: TLS 1.3 in transit, AES-256 at rest for PII fields
4. **GDPR Consent**: Check `customer_consent` table before any data retrieval or processing
5. **PII Redaction**: Logger (Pino) redacts: email, password, token, authorization, line_id
6. **Rate Limiting**: Redis-backed — 100/min API, 10/15min auth, 20/min readings
7. **Audit Trail**: `AuditLog` model records all sensitive operations
8. **Secrets**: Environment variables only — never hardcode in source

For detailed checklist, read `references/security-checklist.md`.

---

## Cost Optimization Principles

1. **Small model first**: Use gpt-4o-mini / claude-3-haiku for routine tasks; reserve larger models for complex interpretations
2. **Cache aggressively**: Card definitions (24hr), customer profiles (10min), recommendations (10min) — reduces DB load significantly
3. **Write-Behind batching**: Visit logs and metrics use 500ms-1s batch flush to reduce write IOPS
4. **InfluxDB downsampling**: Raw data → hourly → daily to control storage growth
5. **Vector search budgets**: Always use score_threshold to avoid returning low-quality matches (Qdrant: 0.68-0.72)
6. **Connection pooling**: pgxpool per database with max connections configured per expected load

---

## Anti-Patterns

Avoid these common mistakes:

1. **Direct DB access** — Always go through DAL (gRPC). No service should have direct DB connection strings except its own local DB
2. **Missing circuit breakers** — All inter-service REST calls must have 3s timeout + circuit breaker
3. **Unversioned event schemas** — Kafka events must include schema version for backward compatibility
4. **Hardcoded credentials** — Use environment variables, never commit secrets
5. **Unbounded queries** — Always paginate (LIMIT/OFFSET or cursor-based), never SELECT *
6. **Sync calls for async work** — If consumer doesn't need immediate response, use Kafka
7. **Ignoring cache invalidation** — DAL Write Hook must invalidate related cache entries
8. **N+1 query patterns** — Use JOINs or batch loading instead of loops
9. **Missing correlation_id** — Every cross-service request must carry correlation_id for tracing
10. **Logging PII** — Always use Pino's redact configuration for sensitive fields

---

## Adding a New Microservice — Checklist

When adding a service to TarotFriend:

1. **Port assignment**: Next available (3000, 3010, 3020, 3030, 3040 taken)
2. **Tech stack**: Node.js + Express + TypeScript + Prisma (default) or Python + FastAPI (for ML)
3. **Database**: Own PostgreSQL DB (`{service}_db`), shared engines via DAL
4. **Docker Compose**: Add service + DB to `docker-compose.yml`
5. **Health endpoint**: `GET /health` returning `{status, components: {db, redis}}`
6. **API Gateway route**: Register `/api/v1/{service}/*` in Kong/Nginx
7. **Kafka topics**: Define produced/consumed events
8. **DAL integration**: Register entity types + cache TTLs in DAL config
9. **CI/CD**: Add to `.github/workflows/ci.yml` matrix
10. **WBS tracking**: Add tasks to `WBS.md` under appropriate phase

---

## Development Phases (from WBS.md)

| Phase | Focus | Milestone |
|-------|-------|-----------|
| P0 | Scaffolding & Infrastructure | All services have `/health` |
| P1 | DAL Core (Go gRPC) | CRUD through gRPC with 3 cache strategies |
| P2 | CustomerManagement Core | Full customer profile management |
| P3 | Advanced Engines (parallel) | 6 storage types operational, < 500ms aggregation |
| P4 | CaringService | Complete caring pipeline |
| P5 | TarotReading Integration | Full DAL + memory + graph integration |
| P6 | ShoppingCart (Shopify) | Shopify integration + crystal recommendations |
| P7 | TarotistScheduler | Scheduling + caring event hooks |
| P8 | Analytics & E2E | Platform complete |

---

## Integration with Other Skills

- **Data Processing Expert**: Provides the storage architecture context for data queries
- **Tarot Expert**: Validates that TarotEngine changes follow the architecture
- **Psychology Expert**: Ensures sentiment pipeline integrates properly with DAL
- **Customer Service Agent**: Validates that CaringService follows event-driven patterns
