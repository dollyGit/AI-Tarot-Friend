# TarotFriend — Work Breakdown Structure (WBS)

> **Version**: v1.1.0
> **Last Updated**: 2025-02-04
> **9 Phases / 8 Milestones / 53 Tasks**

---

## Current Status

| Service | 狀態 | 程式碼 | 設計文件 |
|---------|------|--------|---------|
| **TarotReading** | MVP 完成 (46/174 tasks) | Node.js + Express + TS + Prisma | specs/ |
| **CustomerManagement** | 設計完成，無程式碼 | — | CUSTOMER_SCHEMA.md (112KB) |
| **ShoppingCart** | 設計完成，無程式碼 | — | SHOPIFY_INTEGRATION.md (27KB) |
| **TarotistScheduler** | 空目錄 | — | ARCHITECTURE.md |
| **CaringService** | 空目錄 | — | ARCHITECTURE.md |
| **DataAccessLayer** | 目錄不存在 | — | ARCHITECTURE.md §5 |

---

## Phase 0: Scaffolding & Infrastructure Foundation

### P0.1 Root Config
- [ ] 根目錄 `.gitignore`（Go + Node.js + Python 合併）
- [ ] `.editorconfig`（跨語言一致性）
- [ ] `Makefile` — `make up` / `make down` / `make test-all` / `make lint-all` / per-service targets
- [ ] 根目錄 `README.md` — 專案總覽、服務地圖、quickstart
- **依賴**: 無
- **Done**: `make help` 列出所有指令

### P0.2 Root Docker Compose
- [ ] 建立根目錄 `docker-compose.yml`（基於 ARCHITECTURE.md §9）
  - ① PostgreSQL (pgvector:pg16) — init script 建立 5 個 DB
  - ② MongoDB 7
  - ③ Redis 7 Alpine
  - ④ InfluxDB 2.7
  - ⑤ Qdrant v1.12
  - ⑥ Neo4j 5 Community
  - Kafka (Confluent 7.5 + Zookeeper)
  - Jaeger all-in-one
  - Prometheus
  - Grafana
  - API Gateway (Kong)
- [ ] `docker-compose.override.yml`（dev port mappings）
- [ ] `scripts/init-multiple-dbs.sh`
- [ ] 整合 TarotReading 現有 docker-compose（避免 port 衝突）
- **依賴**: 無
- **Done**: `docker compose up` → 所有容器 healthy

### P0.3 Shared Protobuf (`proto/`)
- [ ] `proto/dal/dal.proto` — gRPC 服務定義（Query / Write / BatchWrite / Subscribe / IngestStream）
- [ ] `proto/dal/customer.proto` / `shop.proto` / `scheduler.proto` / `caring.proto`
- [ ] `proto/events/event.proto` — 共用事件信封 schema
- [ ] `buf.yaml` 或 `protoc` 腳本 → 產生 Go / TypeScript / Python stubs
- **依賴**: 無
- **Done**: 三種語言 stubs 編譯成功、可 import

### P0.4 Shared TypeScript Package (`shared/`)
- [ ] 建立根目錄 `shared/`（與 TarotReading 內部 shared 分開）
- [ ] `shared/types/` — `customer.ts` / `events.ts` / `api-contracts.ts`
- [ ] `shared/services/` — `event-bus.ts` / `service-auth.ts` / `api-client-base.ts`
- [ ] `shared/utils/` — `logger.ts` (Pino) / `health-check.ts`
- [ ] 發布為 `@tarot/shared`（npm workspaces symlink 或 private registry）
- **依賴**: P0.3（proto 生成的 types）
- **Done**: 所有 Node.js 服務可 `import { ... } from '@tarot/shared'`

### P0.5 Node.js Service Template
- [ ] `templates/node-service/` 包含：
  - `package.json`（Express, TypeScript, Prisma, Pino, OpenTelemetry, vitest）
  - `tsconfig.json` (strict mode)
  - `Dockerfile`（multi-stage: build + runtime）
  - `.env.example`
  - 標準目錄結構：`src/api/` / `src/services/` / `src/lib/` / `src/api/middleware/`
  - 預接 middleware：auth / error-handler / rate-limit / health / metrics
  - DAL gRPC client 初始化 boilerplate
  - `vitest.config.ts`
- **依賴**: P0.4
- **Done**: 模板 `npm run dev` → `/health` 回應 200、`/metrics` 有 Prometheus 指標

### P0.6 Scaffold CustomerManagement
- [ ] 從 template 複製 → `/CustomerManagement/`
- [ ] `package.json` name: `@tarot/customer-management`，port: 3010
- [ ] Prisma schema：customer / customer_contact / customer_birth_chart / customer_address / tag / customer_tag / finance_record / customer_consent / customer_note
- [ ] 初始 migration
- **依賴**: P0.5
- **Done**: `npm run dev` → port 3010 `/health` OK、Prisma schema 編譯通過

### P0.7 Scaffold TarotistScheduler
- [ ] 從 template 複製 → `/TarotistScheduler/`
- [ ] `package.json` name: `@tarot/tarotist-scheduler`，port: 3040
- [ ] Prisma schema：tarotist / availability / appointment / review
- [ ] 初始 migration
- **依賴**: P0.5
- **Done**: port 3040 `/health` OK

### P0.8 Scaffold ShoppingCart
- [ ] 從 template 複製 → `/ShoppingCart/`
- [ ] `package.json` name: `@tarot/shopping-cart`，port: 3030
- [ ] Prisma schema：shopify_customer_map / webhook_event_log（僅 2 tables）
- [ ] `.env.example` 加入 Shopify env vars（placeholder，尚不連線）
- [ ] 建立空模組目錄：`webhooks/` / `sync/` / `recommendation/` / `mapper/`
- **依賴**: P0.5
- **Done**: port 3030 `/health` OK、Shopify env documented

### P0.9 Scaffold CaringService (Python + FastAPI)
- [ ] `/CaringService/` 建立 FastAPI 專案結構
  - `pyproject.toml`（FastAPI, uvicorn, grpcio, pydantic, alembic, sqlalchemy, opentelemetry）
  - `Dockerfile`（Python 3.12 multi-stage）
  - `app/main.py` / `app/api/` / `app/services/` / `app/models/` / `app/config.py`
- [ ] SQLAlchemy models：caring_plan / caring_action / sentiment_history / caring_rule / caring_template
- [ ] Alembic 初始 migration
- [ ] gRPC DAL client（Python proto stubs）
- **依賴**: P0.3
- **Done**: `uvicorn app.main:app` → port 3020 `/health` OK

### P0.10 Scaffold DataAccessLayer (Go)
- [ ] `/DataAccessLayer/` 建立 Go 專案結構
  - `cmd/dal-server/main.go`
  - `internal/server/` / `internal/service/` / `internal/cache/` / `internal/storage/` / `internal/stream/` / `internal/middleware/` / `internal/config/`
  - `go.mod`（module `github.com/tarot-friend/dal`）
  - `Dockerfile`（Go multi-stage）
- [ ] `main.go` 啟動 gRPC server + health check
- **依賴**: P0.3
- **Done**: `go run cmd/dal-server/main.go` → port 4000 gRPC health OK

### P0.11 CI/CD Pipeline
- [ ] `.github/workflows/ci.yml` — matrix build per service
  - Node.js services: lint + type-check + unit test
  - Go DAL: lint + compile + unit test
  - Python CaringService: lint + type-check + unit test
  - Proto compilation check
  - Docker build check（build only, no push）
- **依賴**: P0.6 ~ P0.10
- **Done**: PR push → CI all green

---

### **Milestone M0: All Services Scaffolded** ✦
> `docker compose up` → 6 儲存引擎 + 6 應用服務全部 `/health` 回應。CI pipeline green。Proto stubs 三語言可用。

---

## Phase 1: DAL Core（Go gRPC Service）

### P1.1 Storage Router + Connection Pool Manager
- [ ] `internal/storage/router.go` — service context → DB mapping
- [ ] `internal/storage/pool.go` — pgxpool per database，configurable max connections
- [ ] `internal/storage/health.go` — periodic health check for all DB connections
- [ ] `internal/storage/query_builder.go` — dynamic SQL for CRUD
- **依賴**: M0
- **Done**: DAL 可連接 5 個 PostgreSQL DB，health endpoint 報告各 DB 連線狀態

### P1.2 gRPC Service Implementation
- [ ] `internal/server/grpc.go` — gRPC server + interceptors（logging, tracing, auth）
- [ ] `internal/service/*_data.go` — per-domain data service（customer / tarot / shop / scheduler / caring）
- [ ] `Query` RPC — parse filters → route → SQL → response
- [ ] `Write` RPC — parse operation → route → execute → response
- [ ] `BatchWrite` RPC — bidirectional streaming
- [ ] `internal/middleware/auth.go` — service token JWT validation
- **依賴**: P1.1
- **Done**: gRPC client 可對任意 DB 執行 CRUD。Integration tests pass。

### P1.3 Cache Manager
- [ ] `internal/cache/manager.go` — strategy selector by entity config
- [ ] `internal/cache/read_through.go` — cache-first read, DB fallback, populate cache
- [ ] `internal/cache/write_behind.go` — write to cache, async flush to DB（configurable interval）
- [ ] `internal/cache/write_through.go` — sync write to both
- [ ] `internal/cache/invalidator.go` — Write Hook 驅動的快取失效
- [ ] TTL 配置（per entity，依照 ARCHITECTURE.md §5.6）
- **依賴**: P1.2
- **Done**: 三種快取策略正確運作。Cache hit rate 可在 metrics 觀測。

### P1.4 Streaming Pipeline
- [ ] `internal/stream/pipeline.go` — Ingest → Transform → Route → Emit
- [ ] `internal/stream/redis_stream.go` — 模式 A：即時快取同步
- [ ] `internal/stream/kafka_producer.go` — 模式 B：事件持久化
- [ ] `internal/stream/transformer.go` — enrichment / filtering
- [ ] `Subscribe` RPC — server-streaming for real-time changes
- [ ] `IngestStream` RPC — client-streaming for high-frequency writes
- **依賴**: P1.2
- **Done**: Write 自動產生 Redis Stream + Kafka events。Subscribe 可接收即時變更。

### P1.5 Observability
- [ ] `internal/middleware/metrics.go` — Prometheus counters / histograms
- [ ] OpenTelemetry tracing for gRPC + DB operations
- [ ] HTTP `/metrics` endpoint
- [ ] Grafana dashboard JSON（cache hit rate, query latency P50/P95/P99, pool usage）
- **依賴**: P1.2
- **Done**: Prometheus scrapes metrics。Jaeger traces 可見。Grafana dashboard 運作。

---

### **Milestone M1: DAL Core Complete** ✦
> 所有 PostgreSQL DB 可透過 gRPC CRUD。三種快取策略運作。Write 自動產生 Kafka + Redis Stream 事件。Subscribe RPC 即時推送。Metrics + Traces 可觀測。

---

## Phase 2: Customer Management — Core Relational + KV

### P2.1 Customer CRUD + 命理衍生欄位
- [ ] REST API：`POST/GET/PATCH/DELETE /api/v1/customers`
- [ ] 命理自動計算：birth datetime + location → zodiac_sign / chinese_zodiac / wuxing / life_path_number
- [ ] Internal API：`/internal/v1/customers/:id/profile`
- [ ] 所有操作透過 DAL gRPC
- **依賴**: M1
- **Done**: CRUD API 測試通過。命理衍生欄位正確。

### P2.2 Customer Contact（人際圈）
- [ ] REST API：`POST/GET/PATCH/DELETE /api/v1/customers/:id/contacts`
- [ ] 每位 contact 有獨立出生資料 + 命理衍生欄位
- [ ] Relationship types：spouse / child / parent / friend / other
- **依賴**: P2.1
- **Done**: 可新增家人，各自有出生資料和命理欄位。

### P2.3 Birth Chart Index + Finance + Consent + Note
- [ ] `customer_birth_chart` CRUD — subject_type (self/contact) + chart_type + document ref
- [ ] `finance_record` CRUD — purchase / refund / topup
- [ ] `customer_consent` CRUD — GDPR/個資法合規
- [ ] `customer_note` CRUD — 客服備註
- **依賴**: P2.1
- **Done**: 命盤索引支援 self + contact + synastry。財務紀錄完整。

### P2.4 Tags + Address + 會員等級
- [ ] Tag / customer_tag M:N 關係 + 標籤過濾
- [ ] customer_address CRUD
- [ ] 會員等級邏輯
- **依賴**: P2.1
- **Done**: 標籤過濾查詢可用。地址管理完整。

### P2.5 Session / Presence / Rate Limit（KV type③）
- [ ] Session management（sliding TTL）
- [ ] Presence tracking（heartbeat）
- [ ] `conversation:working` — 短期對話記憶 context
- [ ] Rate limiting per customer
- [ ] DAU counter（HyperLogLog）
- **依賴**: M1
- **Done**: Session TTL 正確。Presence 5min heartbeat。HLL DAU 可查。

### P2.6 Kafka Event Producers
- [ ] `customer.created` / `customer.updated` / `customer.deleted`
- [ ] `customer.contact.added` / `customer.contact.updated`
- [ ] `customer.finance.recorded`
- [ ] 事件信封符合 ARCHITECTURE.md §3.3 格式
- **依賴**: P2.1
- **Done**: 所有 customer 寫入操作產生對應 Kafka 事件。

---

### **Milestone M2: Customer Core Complete** ✦
> 8 張 Relational 表完整 CRUD。人際圈（含各自出生/命理資料）。命盤索引。財務紀錄。Session/Presence via KV。事件上 Kafka。

---

## Phase 3: Customer Advanced Engines — Document / TimeSeries / Vector / Graph

> **P3.1 ~ P3.4 可並行開發**（各自擴展 DAL 對不同儲存引擎的支援）

### P3.1 Document Engine（② MongoDB）
- [ ] 擴展 DAL：MongoDB adapter in `internal/storage/`
- [ ] `visit_logs` collection — per-service visit events
- [ ] `activity_events` collection — frontend behavioral events
- [ ] `divination_charts` collection — polymorphic（astrology / bazi / ziwei / synastry）
- [ ] `conversation_raw` collection — 對話原文（3yr TTL）
- [ ] `customer_behavior_profile` collection — 行為畫像
- **依賴**: M2
- **Done**: 5 個 document collections 可透過 DAL 讀寫。命盤多型態 JSON 正確存取。

### P3.2 TimeSeries Engine（④ InfluxDB）
- [ ] 擴展 DAL：InfluxDB write/query adapter
- [ ] `customer_engagement` metric（event count, session duration）
- [ ] `customer_spending` metric（amount over time）
- [ ] `customer_sentiment` metric（score over time）
- [ ] `system_session_gauge` metric（concurrent users）
- [ ] 3-tier downsampling：raw 90d → hourly 1y → daily 3y
- **依賴**: M2
- **Done**: TimeSeries metrics 可寫入、趨勢查詢正確、downsampling 運作。

### P3.3 Vector Engine（⑤ Qdrant）
- [ ] 擴展 DAL：Qdrant upsert / ANN search adapter
- [ ] `conversation_summaries` collection — LLM 生成摘要 embedding
- [ ] `long_term_memory` collection — 長期記憶 embedding
- [ ] 三層記憶架構：Working (KV) → Summary (Vector) → LongTerm (Vector)
- [ ] LLM summarization pipeline
- [ ] Embedding generation（選定 embedding model）
- [ ] RAG retrieval：embed query → ANN search → top-K with threshold
- **依賴**: M2
- **Done**: 對話摘要 embed + 存取。RAG 語意搜尋回傳相關結果。

### P3.4 Graph Engine（⑥ Neo4j）
- [ ] 擴展 DAL：Neo4j Cypher adapter
- [ ] Node types：Customer / Person / Event / Topic / TarotCard / DivinationChart / ZodiacSign / CelestialBody / BaziElement / ZiweiStar / Palace / Crystal / Emotion
- [ ] Edge types：KNOWS / HAS_CHART / SYNASTRY_WITH / PLANET_IN_SIGN / ELEMENT_MATCHES / PURCHASED 等 11+ 種
- [ ] Strength algorithm（frequency 0.3 + recency 0.25 + emotion 0.25 + diversity 0.20）
- [ ] Entity Extraction Pipeline：LLM extract → entity resolution → MERGE
- [ ] Graph traversal queries：multi-hop / pattern matching / path analysis
- **依賴**: M2
- **Done**: 12+ Node types / 11+ Edge types 可讀寫。多跳查詢正確。實體抽取 pipeline 運作。

### P3.5 GetFullCustomerView（跨 6 引擎聚合）
- [ ] 單一 API 聚合 6 種引擎資料：
  1. ① Relational profile + contacts
  2. ② Document behavior profile
  3. ③ KV session / presence
  4. ④ TimeSeries engagement trends
  5. ⑤ Vector memory summaries
  6. ⑥ Graph relationship network
- [ ] Parallel query + merge
- [ ] Cache aggregated result（TTL 2min）
- **依賴**: P3.1 ~ P3.4
- **Done**: 單一 API call < 500ms 回傳完整客戶全貌。

---

### **Milestone M3: Customer Full Data Engine** ✦
> 6 種儲存型態全部運作。三層記憶架構（Working → Summary → LongTerm）可用。實體抽取寫入 Graph。跨引擎聚合 API 完成。

---

## Phase 4: Caring Service（Python + FastAPI）

### P4.1 Kafka Consumer Setup
- [ ] Consumer group 訂閱：customer.* / reading.completed / order.placed / sentiment.alert
- [ ] 事件反序列化（Python proto stubs）
- [ ] Dead Letter Queue (DLQ) for failed processing
- [ ] ⚠️ `appointment.*` handler 在 P7 完成後擴充（見 P7.5）
- **依賴**: M1
- **Done**: 事件正確接收 + 記錄。DLQ 處理失敗事件。

### P4.2 Sentiment History + 趨勢分析
- [ ] `reading.completed` → 寫入 sentiment_history（via DAL）
- [ ] 趨勢分析：rolling average / trend direction / change rate
- [ ] 危機偵測：連續負面 / 突然下降
- [ ] 寫入 ④ TimeSeries via DAL
- **依賴**: P4.1
- **Done**: 情緒趨勢正確追蹤。危機條件觸發告警。

### P4.3 Caring Rules Engine
- [ ] Rule evaluation engine：
  - 不活躍規則：N 天未登入
  - 負面情緒規則：連續 N 次負面
  - 里程碑規則：生日 / 紀念日
  - 購後關懷
- [ ] Rule matching：每次事件觸發時評估所有 active rules
- [ ] Default rule set（seed data）
- [ ] ⚠️ 預約後關懷規則在 P7 完成後新增
- **依賴**: P4.2
- **Done**: 規則正確觸發。Rule CRUD API 可用。

### P4.4 Caring Plan + Action + Template
- [ ] `caring_plan` 生命週期：create → schedule → execute → track
- [ ] `caring_action` 執行：channel dispatch（email / LINE / SMS，初期 stub）
- [ ] `caring_template` CRUD + variable substitution
- [ ] Emit `caring.action_triggered` events
- [ ] Background scheduler：`next_trigger_at` 排程
- **依賴**: P4.3
- **Done**: Rules → Plans → Actions 完整鏈路。Channel dispatch 可擴充。

### P4.5 DAL Subscribe（即時危機回應）
- [ ] DAL `Subscribe` RPC：即時監聽 sentiment_history 變更
- [ ] Crisis-level → 即時觸發 caring rule（不等 Kafka batch）
- **依賴**: P4.1, M1
- **Done**: 即時情緒變更 < 1s 觸發關懷行動。

---

### **Milestone M4: Caring Service Complete** ✦
> 事件消費 → 情緒追蹤 → 規則引擎 → 關懷行動完整鏈路。即時危機回應。（appointment.* 待 M7 擴充）

---

## Phase 5: TarotReading 接入 DAL

### P5.1 DAL Client + Prisma → gRPC 遷移
- [ ] 新增 `@tarot/dal-proto` 依賴
- [ ] `TarotReading/backend/src/lib/dal-client.ts` — DAL gRPC wrapper
- [ ] 遷移 DB 操作：sessions / tarot_draws / reading_feedback / cards / spreads
- [ ] Feature flag 切換：Prisma 直連 ↔ DAL gRPC
- **依賴**: M1
- **Done**: 兩種模式都可運作。所有既有測試在 DAL 模式下通過。

### P5.2 Vector RAG 整合
- [ ] Session 開始時：query conversation_summaries + long_term_memory
- [ ] 注入記憶 context 到 LLM prompt
- [ ] Session 結束時：async pipeline — summarize → embed → upsert
- **依賴**: P5.1, P3.3
- **Done**: Sessions 載入歷史記憶 context。完成的 sessions 產生新的記憶 entries。

### P5.3 Graph 整合
- [ ] Session 開始時：query graph for key people / topics / card history
- [ ] Session 結束時：LLM entity extraction → resolution → MERGE graph
- **依賴**: P5.1, P3.4
- **Done**: 對話持續累積知識圖譜。後續 sessions 可引用圖譜 context。

### P5.4 Event Emission
- [ ] `reading.completed` event（含 sentiment score）via DAL Kafka
- [ ] `sentiment.alert` for crisis-level readings
- [ ] Write visit_logs / engagement metrics via DAL
- **依賴**: P5.1
- **Done**: CaringService 可消費 TarotReading 事件。ARCHITECTURE.md §7 範例 1 完整運作。

---

### **Milestone M5: TarotReading Fully Integrated** ✦
> TarotReading 完全透過 DAL 存取。記憶 RAG 載入 context。圖譜實體抽取運作。事件驅動鏈路完整。

---

## Phase 6: Shopping Cart — Shopify Headless ⚠️ EXTERNAL

> **注意**：此 Phase 依賴外部 Shopify 帳號與 Dev Store 設定。
> Scaffolding（P0.8）已在 Phase 0 完成。

### P6.1 Webhook Handler
- [ ] HMAC-SHA256 signature verification（`X-Shopify-Hmac-Sha256`）
- [ ] Idempotency check：`webhook_event_log` + `X-Shopify-Webhook-Id`
- [ ] 處理 8 種 webhook topics（orders / refunds / products / checkouts）
- [ ] Raw payload 寫入 event log（audit）
- **依賴**: M1, Shopify Dev Store（外部）
- **Done**: Webhooks 接收 + 驗證 + 日誌。重複 webhook 正確 skip。

### P6.2 Event Mapper
- [ ] Shopify webhook → Internal Kafka event mapping（8 種）
- [ ] `orders/create` → ORDER_CREATED → DAL writes（finance_record + spending TS + activity_event）
- [ ] `products/update` → PRODUCT_UPDATED → Graph Crystal node sync
- [ ] 所有 mapped events 發送至 Kafka
- **依賴**: P6.1
- **Done**: 每種 webhook 產生正確的 Kafka event + DAL writes。

### P6.3 Product Sync（Admin API → Graph DB）
- [ ] Shopify Admin API client — product queries with metafields
- [ ] Metafield → Graph 映射：
  - `crystal.wuxing_element` → `(:Crystal)-[:ELEMENT_MATCHES]->(:BaziElement)`
  - `crystal.healing_properties` → `(:Crystal)-[:HEALS]->(:Emotion)`
  - `crystal.zodiac_affinity` → `(:Crystal)-[:ZODIAC_AFFINITY]->(:ZodiacSign)`
- [ ] 即時同步（webhook-triggered）+ 每日全量同步（cron 03:00）
- **依賴**: P6.1, P3.4（Graph engine）
- **Done**: Shopify 水晶商品 → Neo4j Crystal nodes + edges 完整映射。

### P6.4 Crystal Recommendation Engine
- [ ] `GET /api/v1/shop/recommendations/:customerId`
- [ ] 五行推薦：customer bazi_day_master → 生扶五行 → matching crystals（Graph）
- [ ] 情緒推薦：近期對話情緒 → healing crystals（Vector + Graph）
- [ ] 星座推薦：zodiac_sign → crystal affinity（Graph）
- [ ] 多策略加權排序 + 合併
- [ ] Cache recommendations（TTL 10min）
- **依賴**: P6.3, P3.3（Vector engine）, M2（customer data）
- **Done**: 推薦 API 回傳個人化水晶排序 + Shopify product IDs。

### P6.5 Shopify Customer Mapping
- [ ] `shopify_customer_map` 同步：首次購買時建立映射
- [ ] 雙向查詢：internal customer_id ↔ shopify_customer_id
- **依賴**: P6.1, M2
- **Done**: 內外客戶 ID 正確對應。購買資料流向正確的內部客戶。

---

### **Milestone M6: Shopping Cart Complete** ✦
> Shopify webhook 處理 → 商品同步至 Graph → 水晶推薦引擎完整。ARCHITECTURE.md §7 範例 3 完整運作。

---

## Phase 7: Tarotist Scheduler

### P7.1 Tarotist Profile CRUD
- [ ] REST API：`POST/GET/PATCH /api/v1/tarotists`
- [ ] 專長 / 評分 / 簡介 / 時薪
- [ ] 所有操作透過 DAL gRPC
- **依賴**: M1
- **Done**: Tarotist profiles CRUD 測試通過。

### P7.2 Availability + 衝突偵測
- [ ] Availability CRUD：recurring + one-off slots
- [ ] 衝突偵測：overlapping slots prevention
- [ ] 時區處理
- **依賴**: P7.1
- **Done**: 排班管理可用。衝突偵測防止重複。

### P7.3 Appointment Booking + Events
- [ ] `POST /api/v1/appointments`（customer_id + tarotist_id + time slot）
- [ ] 狀態管理：pending → confirmed → completed / cancelled / no_show
- [ ] Optimistic locking 防止同時搶同一時段
- [ ] Kafka events：`appointment.booked` / `confirmed` / `completed` / `cancelled`
- **依賴**: P7.2, M2（需查詢 customer）
- **Done**: 預約流程 E2E。不可 double-book。事件上 Kafka。

### P7.4 Reviews + AI Matching
- [ ] Review CRUD：rating + comment
- [ ] 自動更新 tarotist rating / total_reviews
- [ ] Basic AI matching：customer preferences → ranked tarotists
- [ ] （M3 完成後）Enhanced matching using GetFullCustomerView
- **依賴**: P7.3
- **Done**: 評分更新正確。推薦排序可用。

### P7.5 Caring Service 擴充 — Appointment 事件接入
- [ ] CaringService 新增 `appointment.*` event handlers
- [ ] 新增「預約後關懷」規則至 Rules Engine
- [ ] 測試：appointment.completed → 關懷行動觸發
- **依賴**: P7.3, M4（Caring 已就位）
- **Done**: 預約事件正確觸發關懷流程。

---

### **Milestone M7: Scheduler Complete** ✦
> 塔羅師管理 / 排班 / 預約 / 評價完整。事件流向 Kafka。Caring 預約關懷已接入。

---

## Phase 8: Analytics + Audit Log + E2E

### P8.1 DAL Audit Log
- [ ] DAL Write Hook：每次 Write/BatchWrite 自動 append audit record
- [ ] Fields：operation / service / entity / payload_hash / actor / timestamp
- [ ] Write-Behind：1s batch flush
- [ ] 可依 service / entity / time range 查詢
- **依賴**: M1
- **Done**: 所有 DAL 變動可追溯查詢。

### P8.2 Analytics Consumer
- [ ] Kafka consumer group 訂閱 `dal.events.*`
- [ ] Data warehouse writer（初期 PostgreSQL analytics schema）
- [ ] Pre-aggregation：DAU / reading count / revenue / top tarotists
- [ ] Grafana business metrics dashboards
- **依賴**: M4 ~ M7
- **Done**: Business metrics dashboards live in Grafana。

### P8.3 命盤批次重算 Pipeline
- [ ] Batch job：讀取 birth_chart index → 重算 → 更新 document store + graph
- [ ] 冪等、可斷點續跑、progress tracking
- **依賴**: P3.1
- **Done**: 全部命盤可批次重算。中斷後可續跑。

### P8.4 E2E Integration Tests
- [ ] 場景 1：客戶完成 AI 占卜（6 引擎全觸及）
- [ ] 場景 2：客戶幫家人排命盤
- [ ] 場景 3：客戶購買水晶（Shopify 流程）
- [ ] 場景 4：客戶預約塔羅師
- [ ] 全部在完整 Docker Compose stack 上執行
- **依賴**: ALL
- **Done**: 4 大場景全部通過。

---

### **Milestone M8: Platform Complete** ✦
> 審計日誌可追溯。分析 Dashboard 運作。命盤批次重算。4 大 E2E 場景全通過。平台功能完整。

---

## Dependency Graph

```
P0 (Scaffolding)
 │
 ▼
P1 (DAL Core) ══════════════════════════════════════════════════
 │               \                    \
 ▼                ▼                    \
P2 (Customer)    P5.1 (TR 遷移)        P4 (Caring, 需 M1)
 │                 │                    │
 ▼                 │                    ▼
P3 (Advanced)      │                  M4 (Caring Complete)
 │  ╲   ╲          │
 │   ╲   ╲─────────┤
 │    ╲            ▼
 │     ╲       P5.2~5.4
 │      ╲          │
 │       ╲         ▼
 │        ╲───→ M5 (TR Integrated)
 │
 ▼
P6 (ShoppingCart, EXTERNAL) ←── M2 + P3.3 + P3.4
 │
 ▼
P7 (Scheduler) ←── M2
 │
 ├── P7.5 ←── M4 (Caring 擴充 appointment.*)
 │
 ▼
P8 (Analytics + Audit + E2E)
 │
 ▼
M8 (Platform Complete) 🎯
```

### 可並行軌道

| 軌道 | 條件 | 可並行項目 |
|------|------|-----------|
| Phase 0 基礎 | 無依賴 | P0.1 ~ P0.4 全部獨立 |
| Phase 0 scaffold | P0.5 完成 | P0.6 ~ P0.10 全部可並行 |
| Phase 3 四引擎 | M2 完成 | P3.1 / P3.2 / P3.3 / P3.4 各自獨立 |
| M1 之後 | DAL 可用 | P2 + P5.1（TR遷移）+ P4.1（Caring consumer）可同時開始 |
| M2 之後 | Customer 可用 | P3 可開始 |
| P3 + M4 之後 | 引擎就位 | P5.2~5.4 + P6（Shopify）可並行 |

### Sequential 約束

| 約束 | 原因 |
|------|------|
| P1 blocks all | DAL 是唯一資料閘道 |
| P2 blocks P3/P6/P7 | 所有服務依賴 customer data |
| P3 blocks P5.2/P5.3/P6.3/P6.4 | Vector + Graph engine 需先就位 |
| P6（Shopify）before P7 | 使用者指定 Scheduler 延後 |
| P7.5 needs M4 + P7.3 | Caring 擴充需 Scheduler 事件 + Caring 已就位 |
