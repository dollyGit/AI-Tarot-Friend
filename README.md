# TarotFriend

> AI 驅動的全方位塔羅生活平台 — 具有記憶與主動關懷的 AI 塔羅夥伴

## Architecture

```
                       API Gateway (Kong)
                            │
     ┌──────────┬───────────┼──────────┬──────────────┐
     ▼          ▼           ▼          ▼              ▼
TarotReading CustomerMgmt Caring    Shopping    Tarotist
  :3000       :3010       :3020     :3030       :3040
  Node.js     Node.js     Python    Node.js     Node.js
     │          │           │          │              │
     └──────────┴───────────┼──────────┴──────────────┘
                            │
                   Data Access Layer
                    (Go gRPC) :4000
                            │
     ┌────────┬────────┬────┼────┬──────────┬─────────┐
     ▼        ▼        ▼         ▼          ▼         ▼
  Postgres  MongoDB  Redis   InfluxDB   Qdrant    Neo4j
   :5432    :27017   :6379    :8086    :6333/:6334 :7474/:7687
```

## Services

| Service | Tech | Port | Status | Database |
|---------|------|------|--------|----------|
| **TarotReading** | Node.js + TS + Claude AI | 3000 | MVP Complete | `tarot_db` (PostgreSQL + pgvector) |
| **CustomerManagement** | Node.js + TS + Prisma | 3010 | Scaffolding | `customer_db` (6-storage model) |
| **CaringService** | Python + FastAPI | 3020 | Scaffolding | `caring_db` (PostgreSQL) |
| **ShoppingCart** | Node.js + TS | 3030 | Scaffolding | `shop_db` (PostgreSQL) |
| **TarotistScheduler** | Node.js + TS + Prisma | 3040 | Scaffolding | `scheduler_db` (PostgreSQL) |
| **DataAccessLayer** | Go + gRPC | 4000 | Scaffolding | Routes to all engines |

## Prerequisites

- **Node.js** 20+ (`node -v`)
- **Go** 1.22+ (`go version`)
- **Python** 3.12+ (`python3 --version`)
- **Docker** & Docker Compose (`docker compose version`)
- **buf** (Protobuf toolchain) — `brew install bufbuild/buf/buf`
- **grpcurl** (optional, for DAL testing) — `brew install grpcurl`

## Quickstart

```bash
# 1. Start all infrastructure
make up

# 2. Wait for containers to be healthy
make ps

# 3. Start a service (choose one)
make dev-tarot       # TarotReading    → http://localhost:3000
make dev-customer    # CustomerMgmt    → http://localhost:3010
make dev-caring      # CaringService   → http://localhost:3020
make dev-shopping    # ShoppingCart     → http://localhost:3030
make dev-scheduler   # TarotistSched   → http://localhost:3040
make dev-dal         # DataAccessLayer → grpc://localhost:4000

# 4. Check all service health
make health
```

## Key Commands

```bash
make help            # Show all available commands
make up              # Start Docker infrastructure
make down            # Stop Docker infrastructure
make ps              # Show container status
make logs            # Follow all logs
make test-all        # Run all tests
make lint-all        # Run all linters
make proto           # Compile Protobuf definitions
make health          # Check health of all services
make clean           # Remove build artifacts
```

## Project Structure

```
TarotFriend/
├── TarotReading/          # AI Tarot reading service (MVP)
├── CustomerManagement/    # Customer 360° view
├── CaringService/         # Proactive care engine (Python)
├── ShoppingCart/          # Crystal e-commerce (Shopify Headless)
├── TarotistScheduler/     # Human tarotist marketplace
├── DataAccessLayer/       # Unified data gateway (Go gRPC)
├── packages/
│   └── shared/            # Cross-service shared TypeScript package
├── proto/                 # Protobuf definitions (gRPC + events)
├── templates/
│   └── node-service/      # Node.js microservice template
├── infra/                 # Prometheus, Grafana configs
├── scripts/               # DB init, utilities
├── docker-compose.yml     # All infrastructure
├── Makefile               # Orchestration commands
├── ARCHITECTURE.md        # System design document
└── WBS.md                 # Work Breakdown Structure
```

## Port Map

| Port | Service |
|------|---------|
| 3000 | TarotReading |
| 3010 | CustomerManagement |
| 3020 | CaringService |
| 3030 | ShoppingCart |
| 3040 | TarotistScheduler |
| 4000 | DataAccessLayer (gRPC) |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 9092 | Kafka |
| 27017 | MongoDB |
| 8086 | InfluxDB |
| 6333 | Qdrant (REST) |
| 6334 | Qdrant (gRPC) |
| 7474 | Neo4j (HTTP) |
| 7687 | Neo4j (Bolt) |
| 3100 | Grafana |
| 9090 | Prometheus |
| 16686 | Jaeger |

## Documentation

- [Architecture](ARCHITECTURE.md) — Full system design
- [WBS](WBS.md) — Work Breakdown Structure (9 Phases / 53 Tasks)
