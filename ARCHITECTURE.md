# TarotFriend 微服務架構設計

## 1. 系統全景圖

```
                          ┌──────────────┐
                          │  API Gateway  │
                          │  (Kong/Nginx) │
                          └──────┬───────┘
                                 │
         ┌───────────┬───────────┼───────────┬───────────────┐
         ▼           ▼           ▼           ▼               ▼
   ┌───────────┐┌──────────┐┌─────────┐┌───────────┐┌──────────────┐
   │  Tarot    ││ Customer ││ Caring  ││ Shopping  ││  Tarotist    │
   │  Reading  ││ Mgmt     ││ Service ││   Cart    ││  Scheduler   │
   │ (Node.js) ││ (Node.js)││(Python) ││ (Node.js) ││  (Node.js)   │
   │ :3000     ││ :3010    ││ :3020   ││ :3030     ││  :3040       │
   └─────┬─────┘└────┬─────┘└────┬────┘└─────┬─────┘└──────┬───────┘
         │           │           │           │              │
         └───────────┴───────────┼───────────┴──────────────┘
                                 ▼
              ┌─────────────────────────────────────┐
              │     Data Access Layer (DAL)          │
              │     (Go Service)  :4000              │
              │                                      │
              │  ┌───────────┐  ┌────────────────┐  │
              │  │  gRPC API  │  │  Stream Engine  │  │
              │  │ (同步存取)  │  │ (流式處理管線)   │  │
              │  └─────┬─────┘  └───────┬────────┘  │
              │        │                │            │
              │  ┌─────▼────────────────▼────────┐  │
              │  │       Cache Manager            │  │
              │  │  (Read-through / Write-behind) │  │
              │  └─────────────┬─────────────────┘  │
              │                │                     │
              │  ┌─────────────▼─────────────────┐  │
              │  │      Storage Router            │  │
              │  │  (分庫路由 + 連線池管理)         │  │
              │  └─────────────┬─────────────────┘  │
              └────────────────┼─────────────────────┘
                               │
    ┌──────────┬───────────┬───┼───┬───────────┬──────────┐
    ▼          ▼           ▼   ▼   ▼           ▼          ▼
 ┌───────┐┌────────┐┌────────┐│┌────────┐┌─────────┐┌─────────┐
 │Relatio││Document││KV/Cache│││Time-   ││ Vector  ││ Graph   │
 │nal DB ││  DB    ││        │││Series  ││   DB    ││   DB    │
 │       ││        ││        │││        ││         ││         │
 │•客戶   ││•訪問   ││•Session│││•互動頻率││•對話摘要 ││•人物關係 │
 │ Profile││ 紀錄   ││•在線   │││•消費趨勢││•長期記憶 ││•主題圖譜 │
 │•命理   ││•行為   ││•短期   │││•情緒   ││•語意RAG ││•命盤關聯 │
 │ 資料   ││ 事件   ││ 記憶   │││ 時間線  ││ 檢索    ││•五行水晶│
 │•財務   ││•命盤   ││•Rate  │││•在線   │└─────────┘│ 推薦    │
 │•人際圈 ││ 本體   ││ Limit │││ 人數   │           └─────────┘
 │•標籤   ││•對話   ││       │││       │
 │       ││ 原文   ││       │││       │
 └───────┘└────────┘└────────┘│└────────┘
                              │
   ┌──────── 各服務獨立 DB ────┘─────────────────────────────────┐
   │ tarot_db │ customer_db │ caring_db │ shop_db │ scheduler_db │
   └──────────┴─────────────┴───────────┴─────────┴──────────────┘

  ┌────────────────────── 共用基礎設施 ────────────────────────────┐
  │                                                                │
  │  Redis Cluster     Kafka        Jaeger       Prometheus/Grafana│
  │  (快取/Session)  (事件流)       (追蹤)        (監控)            │
  └────────────────────────────────────────────────────────────────┘
```

---

## 2. 各服務職責與技術選型

### 2.1 TarotReading（已存在）
- **技術**: Node.js + Express + TypeScript + Prisma
- **職責**: AI 塔羅占卜、牌義解讀、情緒分析、危機檢測
- **資料庫**: `tarot_db` (PostgreSQL + pgvector)
- **Port**: 3000

### 2.2 Customer Management
- **技術**: Node.js + Express + TypeScript + Prisma
- **職責**: 客戶 CRUD、命理資料管理、人際圈管理、命盤索引、會員等級、財務紀錄、對話記憶、關係圖譜
- **Port**: 3010
- **六種儲存型態**（全部透過 DAL 存取，技術選型 TBD）:
  - **① 關聯式** `customer_db` — 核心 Profile + 命理出生資料 + 人際圈 + 命盤索引 + 財務 + 標籤 + 同意紀錄
  - **② 文件式** `customer_activity_db` — 訪問紀錄 + 行為事件 + 命盤本體（多型態）+ 對話原文 + 行為畫像
  - **③ 鍵值/快取** — Session + 在線狀態 + 短期對話記憶 + Rate Limit
  - **④ 時序** — 互動頻率 + 消費趨勢 + 情緒時間線 + 在線人數
  - **⑤ 向量** — 對話摘要 embedding + 長期記憶 embedding（RAG 檢索）
  - **⑥ 圖** — 人物關係網 + 事件/主題共現 + 命盤星體關聯 + 五行↔水晶推薦
- **核心 Relational 資料表**:
  - `customer` — 身份 + 命理基本（出生時空、星座、生肖、五行、職業、產業）
  - `customer_contact` — 人際圈（老公/老婆/小孩/父母/朋友，各自有出生資料可排命盤）
  - `customer_birth_chart` — 命盤索引（self/contact 指向 + 合盤 partner + Document 引用）
  - `customer_address` — 寄送地址
  - `tag / customer_tag` — 標籤分群
  - `finance_record` — 消費/退款/儲值
  - `customer_consent` — 隱私同意（GDPR/個資法）
  - `customer_note` — 客服備註
- **詳細 Schema**: 見 `CustomerManagement/CUSTOMER_SCHEMA.md`

### 2.3 Caring Service
- **技術**: Python + FastAPI（ML/NLP 生態系更成熟）
- **職責**: 分析客戶歷史、情緒趨勢、產生關懷建議、觸發主動關懷
- **資料庫**: `caring_db` (PostgreSQL)
- **Port**: 3020
- **核心資料表**:
  - `CaringPlan` — 關懷計畫（頻率、方式、狀態）
  - `CaringAction` — 已執行的關懷動作（email/LINE/電話）
  - `SentimentHistory` — 情緒趨勢記錄
  - `CaringTemplate` — 關懷訊息範本
  - `CaringRule` — 觸發規則（如 7 天未登入、連續負面情緒）

### 2.4 Shopping Cart — Shopify Headless + 水晶推薦引擎
- **技術**: Node.js + Express + TypeScript
- **職責**: Shopify Webhook 處理、商品同步、五行/情緒水晶推薦引擎
- **架構**: Shopify Headless Commerce（Storefront API + Admin API + Webhooks）
- **Port**: 3030
- **Shopify 負責**:
  - 商品目錄 CRUD（Admin API）
  - 購物車（Storefront Cart API，前端直連）
  - 結帳 & 付款（Shopify Payments，PCI DSS 由 Shopify 承擔）
  - 庫存管理 & 訂單管理
  - 退款/退貨
- **我方負責**:
  - Webhook 接收 & HMAC 驗證 → 轉換為內部 Kafka 事件
  - 商品 metafield 同步至 Graph DB（Crystal nodes + ELEMENT_MATCHES edges）
  - 五行/情緒/星座驅動的水晶推薦引擎（Graph + Vector 查詢）
  - 購買行為寫入 DAL（finance_record / visit_logs / spending / PURCHASED edge）
- **Relational 資料表（精簡為 2 張）**:
  - `shopify_customer_map` — 客戶 Shopify 帳號映射
  - `webhook_event_log` — Webhook 事件日誌（冪等性保障）
- **Shopify Metafields（水晶商品屬性）**:
  - `crystal.wuxing_element` — 五行屬性（金木水火土）
  - `crystal.healing_properties` — 療癒屬性
  - `crystal.chakra` — 脈輪對應
  - `crystal.zodiac_affinity` — 星座親和
  - `crystal.emotion_tags` — 情緒標籤
- **服務內部模組**:
  - `webhooks/` — Shopify webhook handler + HMAC 驗證
  - `sync/` — Product → Graph DB 同步器
  - `recommendation/` — 水晶推薦引擎
  - `mapper/` — Shopify events → internal Kafka events
- **詳細設計**: 見 `ShoppingCart/SHOPIFY_INTEGRATION.md`

### 2.5 Tarotist Scheduler
- **技術**: Node.js + Express + TypeScript + Prisma
- **職責**: 塔羅師檔案、排班、預約、評價、推薦配對
- **資料庫**: `scheduler_db` (PostgreSQL)
- **Port**: 3040
- **核心資料表**:
  - `Tarotist` — 塔羅師檔案（專長、評分、簡介）
  - `Availability` — 可預約時段
  - `Appointment` — 預約紀錄
  - `Review` — 客戶評價
  - `TarotistMatch` — AI 推薦配對紀錄

---

## 3. 服務間通訊設計

### 3.1 同步通訊（REST）
服務間直接 HTTP 呼叫，用於即時需要回應的場景：

```
┌─────────────────────────────────────────────────────────────────┐
│ 場景                    │ 呼叫方       │ 被呼叫方    │ 方式     │
├─────────────────────────┼──────────────┼─────────────┼──────────┤
│ 占卜時查詢客戶偏好       │ TarotReading│ CustomerMgmt│ REST GET │
│ 購物車結帳查詢會員折扣    │ ShoppingCart │ CustomerMgmt│ REST GET │
│ 預約時查詢客戶歷史       │ Scheduler   │ CustomerMgmt│ REST GET │
│ 預約時查詢塔羅師空檔     │ BFF/Frontend│ Scheduler   │ REST GET │
│ 占卜後推薦水晶(五行/情緒) │ TarotReading│ ShoppingCart│ REST GET │
└─────────────────────────────────────────────────────────────────┘
```

**服務間 REST 呼叫規範**:
- 統一 Base URL 格式: `http://{service-name}:{port}/internal/v1/`
- `/internal/` 路徑只允許服務間呼叫（透過 API Gateway 擋掉外部存取）
- 使用 Service Token（JWT，issuer: `service-{name}`）做驗證
- 設定 timeout: 3 秒，搭配 circuit breaker

### 3.2 非同步通訊（Event Bus）
透過 Kafka（或初期用 Redis Pub/Sub）處理不需要即時回應的場景：

```
┌──────────────────────────────────────────────────────────────────┐
│ Event                      │ Producer      │ Consumer(s)         │
├────────────────────────────┼───────────────┼─────────────────────┤
│ customer.created           │ CustomerMgmt  │ CaringService       │
│ customer.updated           │ CustomerMgmt  │ All services        │
│ reading.completed          │ TarotReading  │ CaringService,      │
│                            │               │ CustomerMgmt        │
│ order.placed               │ ShoppingCart   │ CustomerMgmt,       │
│  (Shopify webhook 轉換)     │  (webhook→Kafka)│ CaringService     │
│ order.shipped              │ ShoppingCart   │ CustomerMgmt        │
│ appointment.booked         │ Scheduler     │ CustomerMgmt,       │
│                            │               │ CaringService       │
│ appointment.completed      │ Scheduler     │ CaringService       │
│ caring.action_triggered    │ CaringService │ TarotReading (LINE),│
│                            │               │ CustomerMgmt        │
│ sentiment.alert            │ TarotReading  │ CaringService       │
└──────────────────────────────────────────────────────────────────┘
```

### 3.3 Event Schema 標準格式

```json
{
  "event_id": "uuid",
  "event_type": "reading.completed",
  "source": "tarot-reading",
  "timestamp": "2025-01-27T10:00:00Z",
  "version": "1.0",
  "data": {
    "customer_id": "uuid",
    "reading_id": "uuid",
    "sentiment_score": 0.72
  },
  "metadata": {
    "correlation_id": "uuid",
    "trace_id": "uuid"
  }
}
```

---

## 4. 共用基礎設施

### 4.1 API Gateway
```yaml
# Kong / Nginx 路由規則
routes:
  /api/v1/tarot/*      → tarot-reading:3000
  /api/v1/customers/*   → customer-mgmt:3010
  /api/v1/caring/*      → caring-service:3020
  /api/v1/shop/*        → shopping-cart:3030    # recommendation API + webhooks
  /api/v1/schedule/*    → tarotist-scheduler:3040
  /internal/*           → BLOCKED (服務間專用)
```

### 4.2 統一認證
```
                    ┌──────────────┐
  Client ──────────►│ API Gateway  │
  (JWT Token)       │ 驗證 Token    │
                    │ 注入 Header:  │
                    │ X-User-Id    │
                    │ X-User-Role  │
                    └──────┬───────┘
                           │ (已驗證)
                           ▼
                    ┌──────────────┐
                    │ 各微服務      │
                    │ 信任 Gateway  │
                    │ Header 資訊   │
                    └──────────────┘
```

- **外部請求**: Client 帶 JWT → Gateway 驗證 → 轉發給各服務
- **服務間請求**: Service Token（長效 JWT，限定 scope）
- **JWT Secret**: 所有服務共用同一個 secret（或用 JWKS 公鑰驗證）

### 4.3 共用 Redis
```
Redis Cluster
├── cache:tarot:*       → TarotReading 快取
├── cache:customer:*    → Customer 快取
├── cache:shop:*        → 水晶推薦快取/Webhook 冪等鎖
├── session:*           → 統一 Session 管理
├── ratelimit:*         → 各服務共用限流
└── events:*            → Redis Pub/Sub（初期事件匯流排）
```

### 4.4 觀測性（Observability）
所有服務統一接入：
- **Logging**: Pino → 統一 JSON 格式 → 集中收集
- **Tracing**: OpenTelemetry → Jaeger（`correlation_id` 跨服務串聯）
- **Metrics**: Prometheus → Grafana dashboards（每個服務暴露 `/metrics`）

---

## 5. Data Access Layer（DAL）— Go 獨立服務

### 5.1 DAL 定位

DAL 是所有微服務與資料儲存之間的**唯一閘道**。應用服務不直接連資料庫，
而是透過 DAL 的 gRPC API 存取資料。DAL 統一管理：

- **快取策略** — Read-through / Write-behind / Cache-aside
- **流式處理** — 資料變更即時串流給訂閱者
- **分庫路由** — 根據 service context 路由到正確的資料庫
- **連線池** — 統一管理所有 DB 連線，避免各服務各自持有連線池
- **資料一致性** — 跨庫操作的 Saga 協調

### 5.2 技術選型

| 組件 | 技術 | 理由 |
|------|------|------|
| 語言 | **Go 1.22+** | 高併發、低延遲、原生 gRPC 支援 |
| 對外 API | **gRPC + Protobuf** | 強型別、串流支援、跨語言 codegen |
| DB Driver | **pgx v5** | Go 最快的 PostgreSQL driver，原生支援連線池 |
| 快取 | **go-redis v9** | Redis 客戶端，支援 Pipeline/Streams |
| 串流引擎 | **Kafka (sarama)** + **Redis Streams** | Kafka 做持久化事件流，Redis Streams 做即時快取同步 |
| 序列化 | **Protobuf** | 高效二進位序列化，跨服務共用 schema |
| 觀測性 | **OpenTelemetry Go SDK** | 分散式追蹤與指標 |

### 5.3 核心架構

```
┌─────────────────────────────────────────────────────────────┐
│                    DAL Service (:4000)                       │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  gRPC Server                           │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │ Customer │ │  Tarot   │ │   Shop   │ │ Schedule │  │ │
│  │  │ DataSvc  │ │ DataSvc  │ │ DataSvc  │ │ DataSvc  │  │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │ │
│  └───────┼────────────┼────────────┼────────────┼─────────┘ │
│          └────────────┼────────────┘            │           │
│                       ▼                         │           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Stream Pipeline Engine                  │   │
│  │                                                      │   │
│  │  Ingest ──► Transform ──► Route ──► Emit             │   │
│  │    │           │            │         │               │   │
│  │    │     ┌─────▼─────┐     │    ┌────▼────┐          │   │
│  │    │     │ Enrichment│     │    │ Kafka   │          │   │
│  │    │     │ Filter    │     │    │ Redis   │          │   │
│  │    │     │ Aggregate │     │    │ Streams │          │   │
│  │    │     └───────────┘     │    └─────────┘          │   │
│  └───────────────────────────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼────────────────────────────────┐    │
│  │                Cache Manager                         │    │
│  │                                                      │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │Read-Through │  │Write-Behind  │  │Cache-Aside │  │    │
│  │  │             │  │(Async Flush) │  │(Manual)    │  │    │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │    │
│  │                                                      │    │
│  │  策略:                                                │    │
│  │  • customer profile → Read-Through (TTL 10min)       │    │
│  │  • product catalog  → Read-Through (TTL 5min)        │    │
│  │  • visit_log/events → Write-Behind (Batch flush 1s)  │    │
│  │  • cart data        → Cache-Aside  (Session scope)   │    │
│  │  • appointments     → Read-Through (TTL 2min)        │    │
│  └──────────────────────────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────▼────────────────────────────────┐    │
│  │               Storage Router                         │    │
│  │                                                      │    │
│  │  service_context → DB mapping:                       │    │
│  │    "tarot"     → pgpool(tarot_db,    max=20)         │    │
│  │    "customer"  → pgpool(customer_db, max=30)         │    │
│  │    "caring"    → pgpool(caring_db,   max=15)         │    │
│  │    "shop"      → pgpool(shop_db,     max=10)         │    │  // Shopify headless, 僅 2 tables
│  │    "scheduler" → pgpool(scheduler_db,max=15)         │    │
│  │                                                      │    │
│  │  Features:                                           │    │
│  │  • Read replica routing (write→primary, read→replica)│    │
│  │  • Connection pool per DB with health monitoring     │    │
│  │  • Automatic failover                                │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 gRPC API 設計

```protobuf
syntax = "proto3";
package dal;

// ─── 通用 ─────────────────────────────────────
message StreamRequest {
  string service = 1;           // "customer" | "tarot" | "shop" ...
  string entity = 2;            // "customer" | "order" | "appointment" ...
  map<string, string> filters = 3;
}

message DataEvent {
  string event_id = 1;
  string entity = 2;
  string operation = 3;         // "INSERT" | "UPDATE" | "DELETE"
  bytes payload = 4;            // Protobuf-encoded entity
  int64 timestamp = 5;
  map<string, string> metadata = 6;
}

message WriteRequest {
  string service = 1;
  string entity = 2;
  string operation = 3;         // "create" | "update" | "delete"
  bytes payload = 4;
  WriteStrategy strategy = 5;
}

enum WriteStrategy {
  WRITE_THROUGH = 0;            // 同步寫 DB + Cache
  WRITE_BEHIND = 1;             // 先寫 Cache，異步刷 DB
  WRITE_AROUND = 2;             // 只寫 DB，不動 Cache
}

message WriteResponse {
  string id = 1;
  bool success = 2;
  string error = 3;
}

message QueryRequest {
  string service = 1;
  string entity = 2;
  map<string, string> filters = 3;
  int32 limit = 4;
  int32 offset = 5;
  string order_by = 6;
  CachePolicy cache_policy = 7;
}

enum CachePolicy {
  CACHE_FIRST = 0;              // 先查 Cache，miss 再查 DB
  DB_FIRST = 1;                 // 直接查 DB，更新 Cache
  CACHE_ONLY = 2;               // 只查 Cache
  NO_CACHE = 3;                 // 不用 Cache
}

message QueryResponse {
  repeated bytes records = 1;
  int64 total = 2;
  bool from_cache = 3;
}

// ─── 服務定義 ────────────────────────────────────
service DataAccessService {
  // 同步 CRUD
  rpc Query(QueryRequest) returns (QueryResponse);
  rpc Write(WriteRequest) returns (WriteResponse);
  rpc BatchWrite(stream WriteRequest) returns (stream WriteResponse);

  // 流式訂閱：client 訂閱某 entity 的即時變更
  rpc Subscribe(StreamRequest) returns (stream DataEvent);

  // 流式寫入：client 持續推送資料，DAL 批次處理
  rpc IngestStream(stream WriteRequest) returns (stream WriteResponse);
}
```

### 5.5 流式處理管線（Data Streaming Pipeline）

```
┌─────────────────── 資料流方向 ────────────────────────────────┐
│                                                               │
│  ┌─────────┐     ┌─────────┐     ┌──────────┐     ┌───────┐ │
│  │ App     │gRPC │ DAL     │     │ Stream   │     │Kafka  │ │
│  │ Service ├────►│ Ingest  ├────►│ Pipeline ├────►│Topic  │ │
│  │         │     │ Buffer  │     │          │     │       │ │
│  └─────────┘     └─────────┘     └────┬─────┘     └───┬───┘ │
│                                       │               │      │
│                                       ▼               ▼      │
│                                 ┌──────────┐   ┌──────────┐  │
│                                 │ Redis    │   │ Consumer │  │
│                                 │ Streams  │   │ Groups   │  │
│                                 │ (即時)    │   │ (持久化)  │  │
│                                 └────┬─────┘   └────┬─────┘  │
│                                      │              │        │
│                                      ▼              ▼        │
│                              ┌─────────────────────────┐     │
│                              │  Subscriber Services    │     │
│                              │  (CaringService,        │     │
│                              │   CustomerMgmt, etc.)   │     │
│                              └─────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

**兩種流式處理模式**（DAL 為唯一寫入閘道，不需要 CDC 額外捕獲變更）：

#### 模式 A：即時快取同步（Redis Streams）
用於需要毫秒級回應的場景：
```
App 寫入 → DAL Write-Behind Buffer → Redis Stream (dal:changes:{entity})
                                          │
                                          ├─► 其他 App 實例即時收到快取更新
                                          └─► DAL 後台 worker 批次刷入 DB
```
- **場景**: Session 狀態、即時推薦快取同步

#### 模式 B：事件持久化（Kafka）
用於需要保證交付和可重放的場景：
```
App 寫入 → DAL 寫入 DB → DAL 發送 Kafka Event (dal.events.{service}.{entity})
                              │
                              ├─► CustomerMgmt consumer group
                              ├─► CaringService consumer group
                              └─► Analytics consumer group
```
- **場景**: 訂單成立、預約確認、占卜完成、會員狀態變更
- **快取失效**: DAL Write 完成後，透過 Cache Manager 主動 invalidate 對應 cache key
- **審計日誌**: DAL Write 時以 Write-Behind 模式批次寫入 audit_log
- **Analytics**: Kafka event 可被 Analytics consumer group 消費，不需額外 CDC

### 5.6 快取策略詳細設計

```
┌──────────────────────────────────────────────────────────────────┐
│ Entity           │ 策略           │ TTL    │ 失效方式            │
├──────────────────┼───────────────┼────────┼─────────────────────┤
│ Customer Profile │ Read-Through  │ 10 min │ DAL Write Hook 主動失效│
│ Crystal Metadata │ Read-Through  │ 5 min  │ Shopify webhook 失效 │
│ Recommendation   │ Cache-Aside   │ 10 min │ 購買/命盤更新時失效    │
│ Tarotist Profile │ Read-Through  │ 15 min │ DAL Write Hook 主動失效│
│ Availability     │ Read-Through  │ 2 min  │ 預約成功時主動失效    │
│ Card Definitions │ Read-Through  │ 24 hr  │ 幾乎不變，長 TTL     │
│ Visit Log        │ Write-Behind  │ N/A    │ 1s 批次刷入 DB       │
│ Events/Metrics   │ Write-Behind  │ N/A    │ 500ms 批次刷入 Kafka │
│ Sentiment Score  │ Write-Behind  │ N/A    │ 5s 批次彙總後刷入    │
│ Order (active)   │ Write-Through │ 10 min │ 狀態變更時同步更新    │
│ Appointment      │ Write-Through │ 5 min  │ 狀態變更時同步更新    │
└──────────────────────────────────────────────────────────────────┘
```

**Redis Key 命名規範**:
```
dal:cache:{service}:{entity}:{id}           → 單筆快取
dal:cache:{service}:{entity}:list:{hash}    → 列表查詢快取
dal:stream:{service}:{entity}               → Redis Stream channel
dal:lock:{service}:{entity}:{id}            → 分散式鎖
dal:counter:{service}:{metric}              → 計數器
```

### 5.7 DAL 內部模組結構

```
DataAccessLayer/
├── cmd/
│   └── dal-server/
│       └── main.go                 # 進入點
├── internal/
│   ├── server/
│   │   └── grpc.go                 # gRPC server 啟動與攔截器
│   ├── service/
│   │   ├── customer_data.go        # Customer 資料存取邏輯
│   │   ├── tarot_data.go           # Tarot 資料存取邏輯
│   │   ├── shop_data.go            # Shop 資料存取邏輯
│   │   ├── scheduler_data.go       # Scheduler 資料存取邏輯
│   │   └── caring_data.go          # Caring 資料存取邏輯
│   ├── cache/
│   │   ├── manager.go              # 快取策略管理器
│   │   ├── read_through.go         # Read-Through 實作
│   │   ├── write_behind.go         # Write-Behind 實作 (含 flush worker)
│   │   ├── write_through.go        # Write-Through 實作
│   │   └── invalidator.go          # Write Hook 驅動的快取失效
│   ├── storage/
│   │   ├── router.go               # 分庫路由
│   │   ├── pool.go                 # 連線池管理 (pgxpool)
│   │   ├── query_builder.go        # 動態 SQL 建構
│   │   └── health.go               # DB 健康檢查
│   ├── stream/
│   │   ├── pipeline.go             # 流式處理管線核心
│   │   ├── kafka_producer.go       # Kafka 事件發送
│   │   ├── kafka_consumer.go       # Kafka 事件消費
│   │   ├── redis_stream.go         # Redis Streams 即時通道
│   │   └── transformer.go          # 資料轉換/enrichment
│   ├── middleware/
│   │   ├── auth.go                 # Service Token 驗證
│   │   ├── logging.go              # 請求日誌
│   │   ├── metrics.go              # Prometheus 指標
│   │   └── tracing.go              # OpenTelemetry 追蹤
│   └── config/
│       └── config.go               # 環境設定
├── proto/
│   └── dal/
│       ├── dal.proto               # gRPC 服務定義
│       ├── customer.proto          # Customer entity 定義
│       ├── shop.proto              # Shop entity 定義
│       ├── scheduler.proto         # Scheduler entity 定義
│       └── caring.proto            # Caring entity 定義
├── migrations/                     # 各 DB 的 SQL migration
│   ├── tarot_db/
│   ├── customer_db/
│   ├── caring_db/
│   ├── shop_db/
│   └── scheduler_db/
├── Dockerfile
├── go.mod
└── go.sum
```

### 5.8 App Service → DAL 通訊範例

**Node.js 服務呼叫 DAL（透過自動生成的 gRPC client）**:
```typescript
// CustomerManagement 服務內
import { DataAccessServiceClient } from '@tarot/dal-proto';

const dal = new DataAccessServiceClient('dal-service:4000');

// 同步查詢（帶快取策略）
const customer = await dal.query({
  service: 'customer',
  entity: 'customer',
  filters: { id: customerId },
  cachePolicy: CachePolicy.CACHE_FIRST,
});

// 流式寫入（高頻事件如 visit_log）
const stream = dal.ingestStream();
stream.write({
  service: 'customer',
  entity: 'visit_log',
  operation: 'create',
  payload: encode({ customer_id, service: 'tarot', action: 'reading' }),
  strategy: WriteStrategy.WRITE_BEHIND,
});

// 訂閱即時變更（CaringService 監聽情緒變化）
const subscription = dal.subscribe({
  service: 'caring',
  entity: 'sentiment_history',
});
for await (const event of subscription) {
  // 即時處理每筆情緒記錄
  await evaluateCaringRules(event);
}
```

**Python 服務呼叫 DAL（CaringService）**:
```python
import grpc
from dal_proto import dal_pb2, dal_pb2_grpc

channel = grpc.aio.insecure_channel('dal-service:4000')
stub = dal_pb2_grpc.DataAccessServiceStub(channel)

# 訂閱多個 entity 的變更串流
async for event in stub.Subscribe(dal_pb2.StreamRequest(
    service="caring",
    entity="sentiment_history",
)):
    score = decode_sentiment(event.payload)
    if score.label == "crisis":
        await trigger_immediate_caring(score)
```

### 5.9 跨服務資料流（經 DAL 路徑）— 更新版

```
範例：客戶完成 AI 占卜後的完整資料流

[TarotReading]
    │
    │ gRPC: Write(service="tarot", entity="tarot_draw", strategy=WRITE_THROUGH)
    ▼
[DAL Service]
    │
    ├─► 寫入 tarot_db.tarot_draw（同步）
    ├─► 更新 Redis 快取
    ├─► 發送 Redis Stream → dal:stream:tarot:tarot_draw
    └─► 發送 Kafka Event → dal.events.tarot.reading_completed
            │
            ├─► [CustomerMgmt consumer]
            │       └─► gRPC: Write(service="customer", entity="visit_log",
            │                       strategy=WRITE_BEHIND)
            │           → DAL 批次寫入 customer_db
            │
            ├─► [CaringService consumer]
            │       └─► gRPC: Write(service="caring", entity="sentiment_history",
            │                       strategy=WRITE_BEHIND)
            │           → DAL 批次寫入 caring_db
            │           → 觸發 caring_rule 評估
            │           → 若需關懷 → Write caring_action
            │
            └─► [Analytics consumer]
                    └─► 寫入 Data Warehouse
```

---

## 6. 資料庫設計（每服務獨立）

### 6.0 CustomerManagement — 六種儲存型態（技術選型 TBD）

> **完整 Schema 定義**: 見 `CustomerManagement/CUSTOMER_SCHEMA.md`（v0.5.0）

```
┌──────────┬─────────────────────────┬──────────────────────────────────┐
│ 儲存型態  │ 存什麼                   │ 核心資料物件                      │
├──────────┼─────────────────────────┼──────────────────────────────────┤
│ ① 關聯式  │ 身份、命理、財務、關係    │ customer（含出生時空/星座/生肖/   │
│          │                         │   五行/職業/產業）                │
│          │                         │ customer_contact（人際圈：配偶/   │
│          │                         │   子女/父母/朋友，各自有出生資料） │
│          │                         │ customer_birth_chart（命盤索引，  │
│          │                         │   指向 self 或 contact）          │
│          │                         │ customer_address / tag / finance │
│          │                         │ customer_consent / customer_note │
├──────────┼─────────────────────────┼──────────────────────────────────┤
│ ② 文件式  │ 行為活動、命盤本體、對話  │ visit_logs（各服務訪問紀錄）      │
│          │                         │ activity_events（前端行為事件）   │
│          │                         │ divination_charts（命盤本體：     │
│          │                         │   占星/八字/紫微/合盤，多型態）    │
│          │                         │ conversation_raw（對話原文）      │
│          │                         │ customer_behavior_profile        │
├──────────┼─────────────────────────┼──────────────────────────────────┤
│ ③ 鍵值    │ 即時狀態、短期記憶       │ session / presence               │
│          │                         │ conversation:working（context）   │
│          │                         │ ratelimit / daily_active(HLL)    │
├──────────┼─────────────────────────┼──────────────────────────────────┤
│ ④ 時序    │ 趨勢指標、降採樣        │ customer_engagement              │
│          │                         │ customer_spending                │
│          │                         │ customer_sentiment               │
│          │                         │ system_session_gauge             │
├──────────┼─────────────────────────┼──────────────────────────────────┤
│ ⑤ 向量    │ 對話記憶、語意 RAG 檢索  │ conversation_summaries           │
│          │                         │ long_term_memory                 │
│          │ 三層記憶架構：            │ (Working→Summary→LongTerm)      │
├──────────┼─────────────────────────┼──────────────────────────────────┤
│ ⑥ 圖      │ 關係圖譜、實體網絡       │ Nodes: Customer / Person /       │
│          │                         │   Event / Topic / TarotCard /    │
│          │                         │   DivinationChart / ZodiacSign / │
│          │                         │   BaziElement / ZiweiStar /      │
│          │                         │   Palace / Crystal / Emotion     │
│          │                         │ Edges: KNOWS / HAS_CHART /       │
│          │                         │   SYNASTRY_WITH / PLANET_IN_SIGN │
│          │                         │   / ELEMENT_MATCHES ...          │
└──────────┴─────────────────────────┴──────────────────────────────────┘
```

#### 客戶資料的核心關聯模型

```
customer（本人）──1:N──→ customer_contact（老公/小孩/媽媽/朋友...）
    │                         │
    │ subject_type=self       │ subject_type=contact
    ▼                         ▼
customer_birth_chart ──ref──→ divination_charts（② 文件式，命盤本體）
    │                           ├─ 占星本命盤 { planets, houses, aspects }
    │ partner_type=contact      ├─ 八字 { four_pillars, ten_gods, luck_pillars }
    └──→ 合盤 (synastry)        ├─ 紫微斗數 { palaces, ming_master }
                                └─ 更多型態...
```

### 6.1 TarotReading DB (`tarot_db`)
> 已存在，保留原有 schema，將 `User` 改為參照 `customer_id`

### 6.2 Caring Service DB (`caring_db`)

```sql
CREATE TABLE caring_plan (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL,         -- 參照 customer_mgmt 的 customer.id
    type            VARCHAR(30) NOT NULL,  -- weekly_check/mood_followup/milestone
    frequency       VARCHAR(20),           -- daily/weekly/monthly/one_time
    channel         VARCHAR(20) NOT NULL,  -- email/line/sms/phone
    status          VARCHAR(20) DEFAULT 'active',
    next_trigger_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE caring_action (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID REFERENCES caring_plan(id),
    customer_id     UUID NOT NULL,
    channel         VARCHAR(20) NOT NULL,
    template_id     UUID,
    content         TEXT,
    status          VARCHAR(20) DEFAULT 'sent', -- sent/delivered/read/failed
    sent_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sentiment_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL,
    source          VARCHAR(50) NOT NULL,  -- tarot_reading/feedback/chat
    score           DECIMAL(3,2),          -- -1.0 to 1.0
    label           VARCHAR(20),           -- positive/neutral/negative/crisis
    source_ref_id   VARCHAR(100),
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE caring_rule (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    condition       JSONB NOT NULL,        -- {"type":"inactivity","days":7}
    action          JSONB NOT NULL,        -- {"channel":"line","template":"comeback"}
    priority        INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE caring_template (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    channel         VARCHAR(20) NOT NULL,
    locale          VARCHAR(10) DEFAULT 'zh-TW',
    subject         VARCHAR(200),
    body            TEXT NOT NULL,
    variables       JSONB DEFAULT '[]',    -- ["customer_name","last_reading_date"]
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 Shopping Cart DB (`shop_db`) — Shopify Headless 精簡版

> 商品目錄、購物車、訂單、付款、庫存全部由 Shopify 管理。
> 我方僅保留 2 張 Relational table 做帳號映射與 webhook 冪等控制。
> 購買行為數據透過 webhook → DAL 寫入 Customer 的六種儲存引擎。

```sql
-- 客戶 ↔ Shopify 帳號映射
CREATE TABLE shopify_customer_map (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id          UUID NOT NULL,          -- 參照 customer_db.customer.id
    shopify_customer_id  VARCHAR(64) UNIQUE NOT NULL,
    shopify_email        VARCHAR(255),
    synced_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook 事件日誌（冪等性保障）
CREATE TABLE webhook_event_log (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_webhook_id   VARCHAR(128) UNIQUE NOT NULL,
    topic                VARCHAR(64) NOT NULL,   -- e.g. 'orders/create'
    shopify_resource_id  VARCHAR(64),
    payload              JSONB,
    processed_at         TIMESTAMPTZ,
    status               VARCHAR(16) DEFAULT 'pending', -- pending/processed/failed
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_event_log_topic ON webhook_event_log(topic);
CREATE INDEX idx_webhook_event_log_status ON webhook_event_log(status);
```

#### Shopify Webhook → 內部事件對照表

| Shopify Webhook | Internal Event | DAL Writes |
|----------------|----------------|------------|
| `orders/create` | `ORDER_CREATED` | ① finance_record + ④ spending TS + ② activity_event |
| `orders/paid` | `ORDER_PAID` | ① finance_record status update |
| `orders/fulfilled` | `ORDER_FULFILLED` | ② activity_event |
| `orders/cancelled` | `ORDER_CANCELLED` | ① finance_record reversal |
| `refunds/create` | `REFUND_CREATED` | ① finance_record + ④ spending TS |
| `products/update` | `PRODUCT_UPDATED` | ⑥ Graph Crystal node sync |
| `products/delete` | `PRODUCT_DELETED` | ⑥ Graph Crystal node removal |
| `checkouts/create` | `CHECKOUT_STARTED` | ② visit_log + ④ engagement TS |

### 6.4 Tarotist Scheduler DB (`scheduler_db`)

```sql
CREATE TABLE tarotist (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    bio             TEXT,
    avatar_url      TEXT,
    specialties     JSONB DEFAULT '[]',    -- ["love","career","spiritual"]
    rating          DECIMAL(2,1) DEFAULT 0,
    total_reviews   INT DEFAULT 0,
    hourly_rate     DECIMAL(10,2),
    currency        VARCHAR(3) DEFAULT 'TWD',
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE availability (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarotist_id     UUID REFERENCES tarotist(id),
    day_of_week     INT,                   -- 0=Sunday, 6=Saturday
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    is_recurring    BOOLEAN DEFAULT true,
    specific_date   DATE,                  -- for one-off availability
    is_available    BOOLEAN DEFAULT true
);

CREATE TABLE appointment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL,
    tarotist_id     UUID REFERENCES tarotist(id),
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ NOT NULL,
    type            VARCHAR(30) DEFAULT 'online', -- online/in_person
    status          VARCHAR(20) DEFAULT 'pending',
    -- pending/confirmed/completed/cancelled/no_show
    topic           VARCHAR(200),
    meeting_url     TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id  UUID REFERENCES appointment(id),
    customer_id     UUID NOT NULL,
    tarotist_id     UUID REFERENCES tarotist(id),
    rating          INT CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. 跨服務資料流範例

### 範例 1: 客戶完成一次 AI 占卜（六引擎完整流程）

```
1.  [TarotReading] 客戶開始新 Session
2.  [DAL ③ KV]     更新 session TTL、presence → "in_reading"
3.  [DAL ③ KV]     載入 conversation:working（短期記憶）
4.  [DAL ⑤ Vector] 搜尋 conversation_summaries + long_term_memory（RAG 語意召回）
5.  [DAL ⑥ Graph]  取得客戶關鍵人物清單（注入 LLM context）
6.  [DAL ② Doc]    寫入 visit_logs { action: "reading.started" }
7.  [DAL ④ 時序]   寫入 customer_engagement { event_count: 1 }

    ═══ AI 使用記憶 context 進行對話 ═══

8.  [TarotReading]  對話結束，發送事件 → reading.completed { customer_id, sentiment }
9.  [DAL ② Doc]     寫入 conversation_raw（保留對話原文）
10. [DAL ④ 時序]    寫入 customer_sentiment { score }

    ═══ Async Pipeline（摘要 + 實體抽取）═══

11. [Worker]        LLM 生成對話摘要 → embed → DAL ⑤ Vector upsert
12. [Worker]        LLM 抽取實體（人物/事件/主題）→ DAL ⑥ Graph MERGE nodes + edges
13. [DAL ③ KV]     更新 conversation:working 為最新摘要
14. [CustomerMgmt]  寫入 visit_log（DAL ② Doc 更新 behavior_profile）
15. [CaringService] 收到事件 → 更新 sentiment_history → 檢查 caring_rule
```

### 範例 2: 客戶幫家人排命盤

```
1. [CustomerMgmt]  客戶填寫家人出生資料
2. [DAL ① 關聯式]  UPSERT customer_contact（老公/小孩/媽媽）
3. [CustomerMgmt]  選擇命盤類型（占星/八字/紫微）
4. [排盤引擎]       計算命盤 → 產生結構化結果
5. [DAL ② Doc]     INSERT divination_charts（命盤本體，多型態 JSON）
6. [DAL ① 關聯式]  INSERT customer_birth_chart（索引：contact + chart_type + doc_ref）
7. [DAL ⑥ Graph]   MERGE Person node（contact_id 關聯）
                    CREATE (:Person)-[:HAS_CHART]->(:DivinationChart)
                    CREATE (:DivinationChart)-[:PLANET_IN_SIGN]->(:ZodiacSign)  // 占星
                    CREATE (:DivinationChart)-[:DAY_MASTER_IS]->(:BaziElement)  // 八字
8. [CaringService]  收到事件 → 可根據命盤特質推薦關懷策略
```

### 範例 3: 客戶購買水晶商品（Shopify Headless + Graph 推薦）

```
═══ 前端購物流程（直連 Shopify）═══

1. [Frontend]       Storefront API → 瀏覽商品 + 加入購物車
2. [Frontend]       API Gateway → ShoppingCart :3030/recommendation
                    → ⑥ Graph: MATCH (c:Customer)-[:ELEMENT_IS]->(e:BaziElement)
                              MATCH (crystal:Crystal)-[:ELEMENT_MATCHES]->(e)
                    → ⑤ Vector: 近期對話情緒 → 推薦對應療癒水晶
                    → 回傳 ranked crystal list + Storefront product IDs
3. [Frontend]       Storefront API → 結帳 → Shopify Payments 付款

═══ Webhook 處理流程（Shopify → 我方）═══

4. [Shopify]        orders/create webhook → ShoppingCart :3030/webhooks
5. [ShoppingCart]   HMAC 驗證 → 寫入 webhook_event_log（冪等檢查）
6. [ShoppingCart]   Event Mapping → ORDER_CREATED → Kafka
7. [DAL ① 關聯式]  寫入 finance_record
8. [DAL ② Doc]     寫入 visit_logs + activity_events
9. [DAL ④ 時序]    寫入 customer_spending
10.[DAL ⑥ Graph]   CREATE (:Customer)-[:PURCHASED]->(:Crystal)
                    Graph 可反向推薦：五行缺水 → 海藍寶；情緒焦慮 → 紫水晶
11.[CaringService]  收到事件 → 評估是否需要購後關懷
```

### 範例 4: 預約塔羅師

```
1. [Scheduler]     REST 呼叫 DAL → GetFullCustomerView（跨引擎聚合）
                   → ① Profile + ② 行為畫像 + ⑤ 記憶摘要 + ⑥ 關鍵人物
2. [Scheduler]     AI 推薦最適合的塔羅師
3. [Scheduler]     客戶確認預約 → 建立 Appointment
4. [Scheduler]     發送事件 → appointment.booked { customer_id, tarotist_id }
5. [DAL ② Doc]    寫入 visit_logs
6. [CaringService] 收到事件 → 安排預約前提醒 caring_action
```

---

## 8. 共用套件（Monorepo Shared）

```
shared/
├── types/
│   ├── customer.ts        # Customer 共用型別
│   ├── events.ts          # Event schema 定義
│   └── api-contracts.ts   # 既有的 API 型別
├── services/
│   ├── api-client-base.ts # 既有的 HTTP client
│   ├── event-bus.ts       # Event 發送/訂閱 helper
│   └── service-auth.ts    # 服務間 JWT 工具
└── utils/
    ├── logger.ts          # 統一 Pino logger 設定
    └── health-check.ts    # 標準 /health endpoint
```

---

## 9. Docker Compose（開發環境）

```yaml
services:
  # === 基礎設施：儲存引擎 ===

  # ① 關聯式 (技術 TBD，暫用 PostgreSQL)
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_MULTIPLE_DATABASES: tarot_db,customer_db,caring_db,shop_db,scheduler_db

  # ② 文件式 (技術 TBD，暫用 MongoDB)
  document-db:
    image: mongo:7
    ports: ["27017:27017"]
    environment:
      MONGO_INITDB_DATABASE: customer_activity_db

  # ③ 鍵值/快取 (技術 TBD，暫用 Redis)
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # ④ 時序 (技術 TBD，暫用 InfluxDB)
  timeseries-db:
    image: influxdb:2.7
    ports: ["8086:8086"]
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_ORG: tarot-friend
      DOCKER_INFLUXDB_INIT_BUCKET: customer_metrics

  # ⑤ 向量 (技術 TBD，暫用 Qdrant)
  vector-db:
    image: qdrant/qdrant:v1.12
    ports: ["6333:6333", "6334:6334"]

  # ⑥ 圖 (技術 TBD，暫用 Neo4j)
  graph-db:
    image: neo4j:5-community
    ports: ["7474:7474", "7687:7687"]
    environment:
      NEO4J_AUTH: neo4j/tarot-neo4j-pw

  # === 基礎設施：訊息/觀測 ===
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports: ["9092:9092"]

  jaeger:
    image: jaegertracing/all-in-one
    ports: ["16686:16686"]

  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana
    ports: ["3100:3000"]

  # === Data Access Layer ===
  dal-service:
    build: ./DataAccessLayer
    ports: ["4000:4000"]
    depends_on: [postgres, document-db, redis, timeseries-db, vector-db, graph-db, kafka]

  # === 應用服務 ===
  tarot-reading:
    build: ./TarotReading/backend
    ports: ["3000:3000"]
    depends_on: [dal-service]

  customer-mgmt:
    build: ./CustomerManagement
    ports: ["3010:3010"]
    depends_on: [dal-service]

  caring-service:
    build: ./CaringService
    ports: ["3020:3020"]
    depends_on: [dal-service]

  shopping-cart:
    build: ./ShoppingCart
    ports: ["3030:3030"]
    environment:
      SHOPIFY_STORE_DOMAIN: ${SHOPIFY_STORE_DOMAIN}
      SHOPIFY_STOREFRONT_TOKEN: ${SHOPIFY_STOREFRONT_TOKEN}
      SHOPIFY_ADMIN_TOKEN: ${SHOPIFY_ADMIN_TOKEN}
      SHOPIFY_WEBHOOK_SECRET: ${SHOPIFY_WEBHOOK_SECRET}
    depends_on: [dal-service]

  tarotist-scheduler:
    build: ./TarotistScheduler
    ports: ["3040:3040"]
    depends_on: [dal-service]

  # === API Gateway ===
  api-gateway:
    image: kong:3.5
    ports: ["8000:8000", "8001:8001"]
```

---

## 10. Naming Convention（命名規範）

### 10.1 專案目錄與服務名稱

| 層級 | 規則 | 範例 |
|------|------|------|
| **專案資料夾** | PascalCase | `CustomerManagement/`, `ShoppingCart/`, `DataAccessLayer/` |
| **Docker service** | kebab-case | `customer-mgmt`, `shopping-cart`, `dal-service` |
| **Docker image** | kebab-case + 版本 | `tarot/customer-mgmt:1.2.0` |
| **Database name** | snake_case | `customer_db`, `shop_db`, `scheduler_db` |
| **Kafka topic** | dot-separated | `dal.events.shop.order_placed` |
| **Redis key** | colon-separated | `dal:cache:customer:profile:{id}` |

### 10.2 程式碼命名

#### Go（DAL Service）
| 項目 | 規則 | 範例 |
|------|------|------|
| Package | 全小寫，單字 | `cache`, `storage`, `stream` |
| File | snake_case | `query_builder.go`, `redis_stream.go` |
| Exported struct/func | PascalCase | `StorageRouter`, `NewCacheManager()` |
| Unexported | camelCase | `poolSize`, `flushInterval` |
| Interface | 動詞+er 或描述性 | `Writer`, `CacheInvalidator`, `DataService` |
| Proto message | PascalCase | `QueryRequest`, `WriteResponse` |
| Proto field | snake_case | `customer_id`, `cache_policy` |
| Proto service | PascalCase | `DataAccessService` |
| Proto RPC | PascalCase | `BatchWrite`, `IngestStream` |
| Constant | PascalCase (exported) | `MaxPoolSize`, `DefaultTTL` |
| Env var | SCREAMING_SNAKE | `DAL_GRPC_PORT`, `REDIS_URL` |

#### Node.js / TypeScript（BFF, CustomerMgmt, ShoppingCart, Scheduler）
| 項目 | 規則 | 範例 |
|------|------|------|
| File | kebab-case | `tarot-engine.ts`, `api-client.ts` |
| Directory | kebab-case | `services/`, `api/middleware/` |
| Class | PascalCase | `TarotEngine`, `OrderService` |
| Interface/Type | PascalCase + `I` 前綴(optional) | `QueryRequest`, `ICustomerProfile` |
| Function/Method | camelCase | `createReading()`, `getCustomerById()` |
| Variable | camelCase | `customerName`, `orderTotal` |
| Constant | SCREAMING_SNAKE 或 camelCase | `MAX_RETRY_COUNT` / `defaultTimeout` |
| Enum | PascalCase (key+value) | `OrderStatus.Pending` |
| Env var | SCREAMING_SNAKE | `JWT_SECRET`, `DATABASE_URL` |
| npm package scope | `@tarot/` | `@tarot/shared`, `@tarot/dal-proto` |

#### Python（Caring Service）
| 項目 | 規則 | 範例 |
|------|------|------|
| File/Module | snake_case | `caring_engine.py`, `sentiment_analyzer.py` |
| Directory/Package | snake_case | `services/`, `models/` |
| Class | PascalCase | `CaringPlanService`, `SentimentAnalyzer` |
| Function/Method | snake_case | `evaluate_caring_rules()`, `get_history()` |
| Variable | snake_case | `customer_id`, `sentiment_score` |
| Constant | SCREAMING_SNAKE | `MAX_BATCH_SIZE`, `DEFAULT_CHANNEL` |
| Private | `_` 前綴 | `_internal_score`, `_flush_buffer()` |

#### SQL（所有資料庫）
| 項目 | 規則 | 範例 |
|------|------|------|
| Table | snake_case，單數 | `customer`, `order_item`, `caring_plan` |
| Column | snake_case | `customer_id`, `created_at`, `is_active` |
| Index | `idx_{table}_{columns}` | `idx_customer_email`, `idx_order_status_created` |
| Foreign key | `fk_{table}_{ref_table}` | `fk_order_item_order` |
| Constraint | `chk_{table}_{rule}` | `chk_review_rating` |
| Enum/Type values | snake_case | `pending`, `in_progress`, `no_show` |

### 10.3 API 命名

#### REST API（外部 + 內部）
```
外部（Client → API Gateway → Service）:
  GET    /api/v1/customers/:id
  POST   /api/v1/shop/orders
  PATCH  /api/v1/schedule/appointments/:id
  DELETE /api/v1/tarot/sessions/:id

內部（Service → Service）:
  GET    /internal/v1/customers/:id/profile
  POST   /internal/v1/customers/:id/visit-log
```

| 規則 | 說明 |
|------|------|
| 路徑 | kebab-case，複數名詞 |
| 版本 | `/v1/`, `/v2/` |
| 資源 ID | `:id`（UUID） |
| 查詢參數 | snake_case: `?page_size=20&sort_by=created_at` |
| Header | Train-Case: `X-Request-Id`, `X-User-Id` |
| 回應欄位 | snake_case（與 DB 一致）|

#### gRPC（App → DAL）
```
Package:      dal.v1
Service:      DataAccessService
RPC methods:  Query, Write, BatchWrite, Subscribe, IngestStream
Messages:     QueryRequest, WriteResponse, DataEvent
Fields:       service_context, cache_policy, event_id
```

### 10.4 事件命名

```
Kafka Topic:    dal.events.{service}.{entity}_{action}
                dal.events.shop.order_placed
                dal.events.scheduler.appointment_booked
                dal.events.tarot.reading_completed
                dal.events.customer.profile_updated

Redis Stream:   dal:stream:{service}:{entity}
                dal:stream:shop:cart_item
                dal:stream:tarot:session

Event Type:     {domain}.{entity}.{past_tense_verb}
                customer.profile.updated
                shop.order.placed
                scheduler.appointment.cancelled
                caring.action.triggered
```

### 10.5 Git 分支與 Commit

```
Branch:
  feature/{service}/{short-desc}     feature/dal/cache-manager
  fix/{service}/{short-desc}         fix/shop/cart-total-calc
  chore/{scope}/{short-desc}         chore/infra/docker-compose

Commit message (Conventional Commits):
  feat(dal): add write-behind cache flush worker
  fix(shop): correct cart total calculation with discount
  refactor(customer): extract profile validation to shared
  docs(arch): update DAL streaming pipeline design
  test(scheduler): add appointment booking integration tests
```

---

## 11. 開發順序建議

> **完整 WBS（含 52 項子任務、依賴關係、Done 標準）**: 見 `WBS.md`

```
Phase 0 → Scaffolding & Infrastructure Foundation       ◄ 從這裡開始
          • 根目錄 Config（.gitignore / Makefile / Docker Compose）
          • Shared Protobuf → Go / TS / Python stubs
          • Shared TypeScript Package（@tarot/shared）
          • Node.js Service Template
          • Scaffold 全部 6 個服務（含 Prisma schema / Alembic / Go gRPC）
          • CI/CD Pipeline
          ▸ M0: docker compose up → 所有服務 /health OK

Phase 1 → DAL Service（Go）— 所有服務的資料存取基礎
          • Storage Router + Connection Pool（5 PostgreSQL）
          • gRPC Query / Write / BatchWrite RPCs
          • Cache Manager（Read-Through / Write-Behind / Write-Through）
          • Streaming Pipeline — Redis Streams（模式A）+ Kafka（模式B）
          • Observability（Prometheus / Jaeger / Grafana）
          ▸ M1: gRPC CRUD + 快取 + 事件串流全部運作

Phase 2 → Customer Management — Core Relational + KV
          • Customer CRUD + 命理衍生欄位（星座/生肖/五行自動計算）
          • Customer Contact（人際圈，各自有出生資料）
          • Birth Chart Index + Finance + Consent + Note
          • Tags + Address + 會員等級
          • Session / Presence / Rate Limit（KV type③）
          • Kafka Event Producers
          ▸ M2: 8 張表完整 CRUD + KV + 事件上 Kafka

Phase 3 → Customer 進階資料引擎（4 種引擎可並行）
          • ② Document Engine — visit_logs / divination_charts / conversation_raw
          • ④ TimeSeries Engine — engagement / spending / sentiment + downsampling
          • ⑤ Vector Engine — 三層記憶架構 + RAG 語意檢索
          • ⑥ Graph Engine — 12+ Node / 11+ Edge + Entity Extraction Pipeline
          • GetFullCustomerView（跨 6 引擎聚合，< 500ms）
          ▸ M3: 六種儲存型態全部運作 + 跨引擎聚合

Phase 4 → Caring Service (Python) — 依賴 DAL 事件
          • Kafka Consumer（customer.* / reading.* / order.* + DLQ）
          • Sentiment History + 趨勢分析 + 危機偵測
          • Caring Rules Engine（不活躍/負面/里程碑/購後）
          • Caring Plan + Action + Template（channel stubs）
          • DAL Subscribe（即時危機回應 < 1s）
          • ⚠️ appointment.* 待 P7 完成後擴充
          ▸ M4: 事件 → 情緒 → 規則 → 關懷行動完整鏈路

Phase 5 → 整合 TarotReading 接入 DAL
          • DAL Client + Prisma → gRPC 遷移（feature flag）
          • ⑤ Vector RAG 整合（session 開始載入記憶 context）
          • ⑥ Graph 整合（session 結束後實體抽取）
          • Event Emission（reading.completed / sentiment.alert）
          ▸ M5: TarotReading 完全透過 DAL + 記憶 + 圖譜

Phase 6 → Shopping Cart — Shopify Headless ⚠️ EXTERNAL
          • Webhook Handler（HMAC + 冪等）
          • Event Mapper（8 種 webhook → Kafka + DAL writes）
          • Product Sync（Admin API → Graph DB Crystal nodes）
          • Crystal Recommendation Engine（五行/情緒/星座）
          • Shopify Customer Mapping
          ▸ M6: Shopify 串接 + 水晶推薦引擎完整

Phase 7 → Tarotist Scheduler — 依賴 Customer
          • 塔羅師 Profile / Availability / 衝突偵測 / 時區
          • Appointment Booking + Kafka events
          • Reviews + AI Matching（可用 GetFullCustomerView 加強）
          • Caring 擴充：appointment.* handler + 預約後關懷規則
          ▸ M7: 排班 + 預約 + 評價完整 + Caring 預約關懷接入

Phase 8 → Analytics + Audit Log + E2E
          • DAL Audit Log（Write-Behind 批次寫入）
          • Analytics Consumer（Kafka → Warehouse + Grafana Dashboard）
          • 命盤批次重算 Pipeline
          • E2E Integration Tests（4 大場景）
          ▸ M8: 平台功能完整 🎯
```

### 依賴關係與並行軌道

```
P0 → P1 → P2 ──→ P3 (4引擎可並行) ──→ P6 (Shopify) → P7 (Scheduler) → P8 → M8
             │ ╲                         ↑               │
             │  ╲──→ P4 (Caring)         │               ├── P7.5 (Caring 擴充, 需 M4)
             │                           │               │
             └──→ P5 (TR 遷移, 需 P3.3+P3.4 for RAG/Graph)
```
