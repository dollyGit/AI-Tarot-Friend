# ShoppingCart — Shopify Headless Integration Schema

> **Version**: v0.1.0
> **Last Updated**: 2025-02-03
> **Architecture Pattern**: Shopify Headless Commerce + 水晶推薦引擎

---

## 0. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend                                   │
│                                                                     │
│  ┌──────────────────────┐     ┌──────────────────────────────────┐  │
│  │ Shopify Storefront   │     │     Our Recommendation UI        │  │
│  │ API (直連)            │     │                                  │  │
│  │ • 商品列表/搜尋        │     │ • 五行推薦水晶                    │  │
│  │ • 購物車 CRUD          │     │ • 情緒推薦水晶                    │  │
│  │ • 結帳 → Shopify 頁面  │     │ • 星座推薦水晶                    │  │
│  └──────────┬───────────┘     └───────────────┬──────────────────┘  │
│             │ (HTTPS)                          │ (HTTPS)             │
└─────────────┼──────────────────────────────────┼────────────────────┘
              │                                  │
              ▼                                  ▼
┌──────────────────┐              ┌──────────────────────────┐
│  Shopify Cloud   │              │    API Gateway            │
│                  │              └────────────┬─────────────┘
│ • Products       │                           │
│ • Cart           │              ┌────────────▼─────────────┐
│ • Checkout       │              │  ShoppingCart :3030       │
│ • Payments       │   Webhooks   │                          │
│ • Orders         ├─────────────►│  ┌─────────────────────┐ │
│ • Inventory      │              │  │ Webhook Handler     │ │
│ • Refunds        │              │  │ (HMAC verify)       │ │
│                  │              │  └──────────┬──────────┘ │
└──────────────────┘              │             │            │
                                  │  ┌──────────▼──────────┐ │
                                  │  │ Event Mapper        │ │
                                  │  │ (Shopify → Kafka)   │ │
                                  │  └──────────┬──────────┘ │
                                  │             │            │
                                  │  ┌──────────▼──────────┐ │
                                  │  │ Product Sync        │ │
                                  │  │ (Admin API → Graph) │ │
                                  │  └─────────────────────┘ │
                                  │                          │
                                  │  ┌─────────────────────┐ │
                                  │  │ Recommendation      │ │
                                  │  │ Engine              │ │
                                  │  │ (Graph + Vector)    │ │
                                  │  └─────────────────────┘ │
                                  │             │            │
                                  └─────────────┼────────────┘
                                                │ gRPC
                                                ▼
                                  ┌──────────────────────────┐
                                  │    DAL Service :4000     │
                                  │                          │
                                  │ ① shop_db (2 tables)     │
                                  │ ② Document (activity)    │
                                  │ ④ TimeSeries (spending)  │
                                  │ ⑥ Graph (Crystal nodes)  │
                                  └──────────────────────────┘
```

---

## 1. Shopify 職責劃分

| 職責 | Shopify | ShoppingCart (我方) |
|------|---------|-------------------|
| 商品目錄 CRUD | ✅ Admin API | → Sync to Graph DB |
| 商品圖片/描述 | ✅ | — |
| 庫存管理 | ✅ Inventory API | — |
| 購物車 | ✅ Storefront Cart API | — (前端直連) |
| 結帳頁面 | ✅ Checkout | — |
| 付款 | ✅ Shopify Payments | — (PCI DSS 免責) |
| 訂單管理 | ✅ Orders | 接收 webhook |
| 退款/退貨 | ✅ Refund API | 接收 webhook |
| 物流追蹤 | ✅ Fulfillment API | 接收 webhook |
| 水晶推薦 | Metafields 提供屬性 | ✅ 推薦引擎 |
| 客戶行為追蹤 | — | ✅ webhook → DAL |
| Graph 關係更新 | — | ✅ PURCHASED edge |

---

## 2. Relational Schema（① 關聯式 — `shop_db`，僅 2 tables）

```sql
-- ═══════════════════════════════════════════════════════
-- shopify_customer_map: 我方客戶 ↔ Shopify 客戶帳號映射
-- ═══════════════════════════════════════════════════════
CREATE TABLE shopify_customer_map (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id          UUID NOT NULL,          -- FK → customer_db.customer.id (via DAL)
    shopify_customer_id  VARCHAR(64) UNIQUE NOT NULL,  -- Shopify 的 customer GID
    shopify_email        VARCHAR(255),
    shopify_accepts_marketing BOOLEAN DEFAULT false,
    synced_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopify_customer_map_customer ON shopify_customer_map(customer_id);

-- ═══════════════════════════════════════════════════════
-- webhook_event_log: Shopify webhook 事件日誌（冪等性保障）
-- ═══════════════════════════════════════════════════════
CREATE TABLE webhook_event_log (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_webhook_id   VARCHAR(128) UNIQUE NOT NULL,  -- X-Shopify-Webhook-Id header
    topic                VARCHAR(64) NOT NULL,           -- e.g. 'orders/create'
    shopify_resource_id  VARCHAR(64),                    -- e.g. order GID
    payload              JSONB,                          -- 原始 payload（audit 用）
    internal_event_type  VARCHAR(64),                    -- 轉換後的內部事件名
    processed_at         TIMESTAMPTZ,
    error_message        TEXT,
    retry_count          INT DEFAULT 0,
    status               VARCHAR(16) DEFAULT 'pending',  -- pending/processed/failed/skipped
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_topic ON webhook_event_log(topic);
CREATE INDEX idx_webhook_status ON webhook_event_log(status);
CREATE INDEX idx_webhook_created ON webhook_event_log(created_at);
```

---

## 3. Shopify Metafields（水晶商品自訂屬性）

> 在 Shopify Admin → Settings → Custom data → Products 中建立以下 metafield 定義。
> Product Sync 模組會定期透過 Admin API 拉取這些 metafields。

| Namespace.Key | Type | 說明 | Example |
|--------------|------|------|---------|
| `crystal.wuxing_element` | `single_line_text` | 五行屬性 | `"水"` / `"fire"` |
| `crystal.wuxing_support` | `list.single_line_text` | 五行生扶關係 | `["木","火"]` |
| `crystal.healing_properties` | `list.single_line_text` | 療癒屬性 | `["安撫焦慮","增強自信","促進溝通"]` |
| `crystal.chakra` | `single_line_text` | 脈輪對應 | `"heart"` / `"throat"` |
| `crystal.chakra_secondary` | `single_line_text` | 次要脈輪 | `"solar_plexus"` |
| `crystal.zodiac_affinity` | `list.single_line_text` | 星座親和 | `["cancer","pisces","scorpio"]` |
| `crystal.emotion_tags` | `list.single_line_text` | 情緒標籤 | `["calm","love","protection"]` |
| `crystal.mineral_name` | `single_line_text` | 礦物學名 | `"rose_quartz"` |
| `crystal.hardness` | `number_decimal` | 莫氏硬度 | `7.0` |
| `crystal.origin` | `single_line_text` | 產地 | `"Brazil"` |

### Metafield → Graph DB 映射

```
Shopify Product (Admin API pull)
    │
    ├─► ⑥ Graph: CREATE/MERGE (:Crystal {
    │       shopify_product_id, name, wuxing_element,
    │       healing_properties, chakra, mineral_name
    │   })
    │
    ├─► ⑥ Graph: MERGE (:Crystal)-[:ELEMENT_MATCHES]->(:BaziElement)
    │       // wuxing_element → 對應五行 node
    │
    ├─► ⑥ Graph: MERGE (:Crystal)-[:HEALS]->(:Emotion)
    │       // emotion_tags → 對應情緒 node
    │
    └─► ⑥ Graph: MERGE (:Crystal)-[:ZODIAC_AFFINITY]->(:ZodiacSign)
            // zodiac_affinity → 對應星座 node
```

---

## 4. Webhook Handler 設計

### 4.1 HMAC 驗證流程

```
Shopify POST → /api/v1/shop/webhooks
    │
    ├─ 1. 讀取 X-Shopify-Hmac-Sha256 header
    ├─ 2. 用 SHOPIFY_WEBHOOK_SECRET 對 raw body 做 HMAC-SHA256
    ├─ 3. Base64 encode → 比較 header 值
    ├─ 4. 不符 → 403 Forbidden
    └─ 5. 符合 → 進入冪等檢查
```

### 4.2 冪等處理流程

```
通過 HMAC →
    │
    ├─ 1. 取 X-Shopify-Webhook-Id header
    ├─ 2. SELECT FROM webhook_event_log WHERE shopify_webhook_id = ?
    ├─ 3. 已存在且 status='processed' → 200 OK (skip)
    ├─ 4. 已存在且 status='failed' → retry 處理
    └─ 5. 不存在 → INSERT pending → 開始處理 → UPDATE processed
```

### 4.3 處理失敗重試

```
status='failed' 且 retry_count < 3 →
    │
    ├─ retry_count++
    ├─ 重新處理
    ├─ 成功 → status='processed'
    └─ 失敗 → status='failed', 記錄 error_message
               retry_count >= 3 → 發送告警
```

---

## 5. Event Mapping（Shopify Webhook → Internal Kafka Events）

### 5.1 對照表

| Shopify Webhook Topic | Internal Event Type | Kafka Topic | DAL Writes |
|----------------------|--------------------|-----------|----|
| `orders/create` | `ORDER_CREATED` | `dal.events.shop.order_created` | ① finance_record + ② activity_event + ④ spending |
| `orders/paid` | `ORDER_PAID` | `dal.events.shop.order_paid` | ① finance_record status → paid |
| `orders/fulfilled` | `ORDER_FULFILLED` | `dal.events.shop.order_fulfilled` | ② activity_event |
| `orders/cancelled` | `ORDER_CANCELLED` | `dal.events.shop.order_cancelled` | ① finance_record reversal + ④ spending (negative) |
| `orders/updated` | `ORDER_UPDATED` | `dal.events.shop.order_updated` | — (selective processing) |
| `refunds/create` | `REFUND_CREATED` | `dal.events.shop.refund_created` | ① finance_record + ④ spending (negative) |
| `products/create` | `PRODUCT_CREATED` | `dal.events.shop.product_created` | ⑥ Graph Crystal node + edges |
| `products/update` | `PRODUCT_UPDATED` | `dal.events.shop.product_updated` | ⑥ Graph Crystal node update |
| `products/delete` | `PRODUCT_DELETED` | `dal.events.shop.product_deleted` | ⑥ Graph Crystal node removal |
| `checkouts/create` | `CHECKOUT_STARTED` | `dal.events.shop.checkout_started` | ② visit_log + ④ engagement |
| `checkouts/update` | `CHECKOUT_UPDATED` | — | — (不處理) |
| `customers/create` | `SHOPIFY_CUSTOMER_CREATED` | — | ① shopify_customer_map |
| `customers/update` | `SHOPIFY_CUSTOMER_UPDATED` | — | ① shopify_customer_map sync |

### 5.2 Event Payload 格式

```json
{
  "event_id": "uuid",
  "event_type": "shop.order.created",
  "source": "shopping-cart",
  "timestamp": "2025-02-03T10:00:00Z",
  "version": "1.0",
  "data": {
    "customer_id": "uuid (我方 customer_id)",
    "shopify_order_id": "gid://shopify/Order/12345",
    "total_amount": 2580.00,
    "currency": "TWD",
    "items": [
      {
        "shopify_product_id": "gid://shopify/Product/67890",
        "product_name": "粉晶手鍊 - 愛情守護",
        "quantity": 1,
        "unit_price": 1280.00,
        "wuxing_element": "火",
        "crystal_type": "rose_quartz"
      }
    ]
  },
  "metadata": {
    "shopify_webhook_id": "xxx",
    "correlation_id": "uuid",
    "trace_id": "uuid"
  }
}
```

---

## 6. Product Sync 模組

### 6.1 同步策略

```
┌──────────────────────────────────────────────────┐
│ 觸發方式                                          │
├──────────────────────────────────────────────────┤
│ 1. Shopify webhook: products/create, update      │
│    → 即時同步（Reactive）                          │
│                                                  │
│ 2. 定時排程: 每日 03:00 全量同步                    │
│    → Admin API 分頁拉取所有 products               │
│    → 比對 Graph DB，處理差異（Full Sync）            │
│                                                  │
│ 3. 手動觸發: Admin API endpoint                    │
│    → POST /internal/v1/shop/sync/products         │
└──────────────────────────────────────────────────┘
```

### 6.2 同步流程

```
Admin API: GET /admin/api/2024-01/products.json
    │      ?fields=id,title,variants,metafields,status
    │
    ├─► 解析 metafields (wuxing, healing, chakra, zodiac, emotion)
    │
    ├─► DAL ⑥ Graph:
    │   MERGE (c:Crystal {shopify_product_id: $id})
    │   SET c.name = $title,
    │       c.wuxing_element = $wuxing,
    │       c.healing_properties = $healing,
    │       c.chakra = $chakra,
    │       c.price = $price,
    │       c.is_active = $status == 'active',
    │       c.synced_at = datetime()
    │
    ├─► DAL ⑥ Graph:
    │   // 五行關聯
    │   MATCH (e:BaziElement {name: $wuxing})
    │   MERGE (c)-[:ELEMENT_MATCHES]->(e)
    │
    ├─► DAL ⑥ Graph:
    │   // 情緒關聯
    │   UNWIND $emotion_tags AS tag
    │   MERGE (em:Emotion {name: tag})
    │   MERGE (c)-[:HEALS]->(em)
    │
    └─► DAL ⑥ Graph:
        // 星座關聯
        UNWIND $zodiac_affinity AS sign
        MERGE (z:ZodiacSign {name: sign})
        MERGE (c)-[:ZODIAC_AFFINITY]->(z)
```

---

## 7. 水晶推薦引擎

### 7.1 推薦策略

| 策略 | 輸入 | 查詢引擎 | 說明 |
|------|------|---------|------|
| 五行推薦 | customer.bazi_day_master | ⑥ Graph | 根據八字日主五行，推薦生扶/平衡的水晶 |
| 情緒推薦 | 近期對話情緒 | ⑤ Vector + ⑥ Graph | RAG 取近期情緒 → 推薦療癒對應水晶 |
| 星座推薦 | customer.zodiac_sign | ⑥ Graph | 根據太陽星座推薦親和水晶 |
| 脈輪推薦 | 近期對話主題 | ⑤ Vector + ⑥ Graph | 根據對話主題判斷需強化的脈輪 → 推薦水晶 |
| 協同推薦 | 購買歷史 | ⑥ Graph | 類似客戶購買的水晶（Graph 社群偵測）|

### 7.2 五行推薦 Cypher 查詢

```cypher
// 客戶八字日主為「木」→ 推薦五行「水」（水生木）的水晶
MATCH (cust:Customer {id: $customerId})-[:DAY_MASTER_IS]->(dm:BaziElement)

// 找到「生」日主的五行
WITH dm, CASE dm.name
  WHEN '木' THEN '水'   // 水生木
  WHEN '火' THEN '木'   // 木生火
  WHEN '土' THEN '火'   // 火生土
  WHEN '金' THEN '土'   // 土生金
  WHEN '水' THEN '金'   // 金生水
END AS supporting_element

MATCH (crystal:Crystal)-[:ELEMENT_MATCHES]->(e:BaziElement {name: supporting_element})
WHERE crystal.is_active = true

// 排除已購買的
OPTIONAL MATCH (cust)-[p:PURCHASED]->(crystal)

RETURN crystal.shopify_product_id AS product_id,
       crystal.name AS name,
       crystal.wuxing_element AS element,
       crystal.healing_properties AS healing,
       crystal.price AS price,
       p IS NOT NULL AS already_purchased,
       CASE WHEN p IS NOT NULL THEN 0.5 ELSE 1.0 END AS score
ORDER BY score DESC, crystal.name
LIMIT 10
```

### 7.3 情緒推薦流程

```
1. [⑤ Vector] 查詢近期對話摘要 (conversation_summaries)
   → 取得 top-3 情緒關鍵字 (e.g. "anxiety", "heartbreak", "confusion")

2. [⑥ Graph]
   MATCH (em:Emotion)<-[:HEALS]-(crystal:Crystal)
   WHERE em.name IN $emotion_keywords
   AND crystal.is_active = true
   RETURN crystal, count(em) AS match_count
   ORDER BY match_count DESC
   LIMIT 10

3. 合併五行推薦結果 → 加權排序 → 回傳 ranked list
```

### 7.4 Recommendation API

```
GET /api/v1/shop/recommendations?customer_id={id}

Response:
{
  "recommendations": [
    {
      "shopify_product_id": "gid://shopify/Product/67890",
      "name": "海藍寶手鍊 - 溝通之石",
      "reason": "wuxing_support",
      "reason_detail": "您的八字日主為木，水能生木，海藍寶（水）能幫助您提升整體能量",
      "wuxing_element": "水",
      "healing_properties": ["促進溝通", "安撫焦慮", "增強直覺"],
      "score": 0.95,
      "price": 1680.00,
      "currency": "TWD"
    },
    {
      "shopify_product_id": "gid://shopify/Product/11111",
      "name": "紫水晶墜飾 - 心靈守護",
      "reason": "emotion_healing",
      "reason_detail": "根據您近期的對話，感受到一些焦慮情緒，紫水晶有助於安撫心靈",
      "wuxing_element": "火",
      "healing_properties": ["安撫焦慮", "提升直覺", "助眠"],
      "score": 0.88,
      "price": 2280.00,
      "currency": "TWD"
    }
  ],
  "strategy_weights": {
    "wuxing": 0.35,
    "emotion": 0.30,
    "zodiac": 0.20,
    "collaborative": 0.15
  }
}
```

---

## 8. 前端 Storefront API 串接模式

> 前端**直接**呼叫 Shopify Storefront API，不經過我方 API Gateway。
> 僅推薦 API 走我方服務。

### 8.1 Storefront API 使用

```typescript
// Frontend: 商品列表（直連 Shopify）
const STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`;

const PRODUCTS_QUERY = `
  query Products($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          priceRange { minVariantPrice { amount currencyCode } }
          images(first: 3) { edges { node { url altText } } }
          metafields(identifiers: [
            {namespace: "crystal", key: "wuxing_element"},
            {namespace: "crystal", key: "healing_properties"},
            {namespace: "crystal", key: "emotion_tags"}
          ]) { key value }
        }
      }
    }
  }
`;
```

### 8.2 購物車流程

```typescript
// Frontend: 加入購物車（直連 Shopify）
const CART_CREATE = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl    // ← Shopify 託管結帳頁 URL
        lines(first: 10) {
          edges { node { merchandise { ... on ProductVariant { title } } quantity } }
        }
        cost { totalAmount { amount currencyCode } }
      }
    }
  }
`;

// 結帳：直接導向 cart.checkoutUrl → Shopify 結帳頁
```

### 8.3 結合推薦的前端流程

```
1. 頁面載入 → 並行:
   a. Storefront API: 取商品列表
   b. Our API: GET /api/v1/shop/recommendations?customer_id=xxx

2. 渲染商品頁 → 推薦水晶區塊顯示:
   "根據您的命理分析，以下水晶特別適合您："
   [推薦水晶卡片 1] [推薦水晶卡片 2] [推薦水晶卡片 3]

3. 點擊推薦水晶 → Storefront API: 取商品詳情
4. 加入購物車 → Storefront API: cartLinesAdd
5. 結帳 → window.location = cart.checkoutUrl
6. Shopify 結帳完成 → webhook 通知我方
```

---

## 9. DAL Writes 詳細對照

### 9.1 ORDER_CREATED 事件觸發的 DAL 寫入

```
webhook: orders/create
    │
    ├─► ① Relational (customer_db):
    │   INSERT INTO finance_record (
    │     customer_id, type, amount, currency, reference_type,
    │     reference_id, description, status
    │   ) VALUES (
    │     $customer_id, 'purchase', $total, 'TWD', 'shopify_order',
    │     $shopify_order_id, '水晶商品購買', 'completed'
    │   );
    │
    ├─► ② Document (customer_activity_db):
    │   db.visit_logs.insertOne({
    │     customer_id, service: 'shopping_cart',
    │     action: 'order_placed',
    │     details: { shopify_order_id, items, total },
    │     timestamp: new Date()
    │   });
    │
    │   db.activity_events.insertOne({
    │     customer_id, event_type: 'purchase',
    │     source: 'shopify_webhook',
    │     properties: { order_id, items_count, total_amount },
    │     timestamp: new Date()
    │   });
    │
    ├─► ④ TimeSeries:
    │   customer_spending,customer_id=$id amount=$total,
    │     items_count=$count,currency="TWD" $timestamp
    │
    └─► ⑥ Graph:
        MATCH (cust:Customer {id: $customer_id})
        UNWIND $items AS item
        MATCH (crystal:Crystal {shopify_product_id: item.product_id})
        MERGE (cust)-[r:PURCHASED]->(crystal)
        ON CREATE SET r.first_purchase = datetime(), r.count = 1
        ON MATCH SET r.last_purchase = datetime(), r.count = r.count + 1
```

---

## 10. Service Module Structure

```
ShoppingCart/
├── src/
│   ├── index.ts                    # Express app entry
│   ├── config/
│   │   └── shopify.config.ts       # Shopify API keys, webhook secret
│   │
│   ├── webhooks/
│   │   ├── handler.ts              # Webhook HTTP handler
│   │   ├── hmac.ts                 # HMAC-SHA256 verification
│   │   └── idempotency.ts          # webhook_event_log 冪等檢查
│   │
│   ├── mapper/
│   │   ├── event-mapper.ts         # Shopify topic → internal event type
│   │   ├── order-mapper.ts         # Order webhook → ORDER_CREATED payload
│   │   ├── product-mapper.ts       # Product webhook → PRODUCT_UPDATED payload
│   │   └── customer-mapper.ts      # Customer webhook → mapping update
│   │
│   ├── sync/
│   │   ├── product-sync.ts         # Admin API → Graph DB 全量/增量同步
│   │   ├── metafield-parser.ts     # 解析 crystal.* metafields
│   │   └── graph-writer.ts         # Crystal node + edges 寫入 DAL
│   │
│   ├── recommendation/
│   │   ├── engine.ts               # 推薦引擎主邏輯（多策略合併）
│   │   ├── wuxing-strategy.ts      # 五行推薦策略
│   │   ├── emotion-strategy.ts     # 情緒推薦策略
│   │   ├── zodiac-strategy.ts      # 星座推薦策略
│   │   ├── collaborative-strategy.ts # 協同推薦策略
│   │   └── scorer.ts               # 加權評分合併
│   │
│   ├── dal-client/
│   │   └── client.ts               # DAL gRPC client wrapper
│   │
│   └── routes/
│       ├── webhook.routes.ts       # POST /api/v1/shop/webhooks
│       ├── recommendation.routes.ts # GET /api/v1/shop/recommendations
│       └── sync.routes.ts          # POST /internal/v1/shop/sync/*
│
├── tests/
│   ├── webhooks/
│   │   ├── hmac.test.ts
│   │   └── idempotency.test.ts
│   ├── recommendation/
│   │   ├── wuxing-strategy.test.ts
│   │   └── engine.test.ts
│   └── sync/
│       └── product-sync.test.ts
│
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## 11. Environment Variables

```env
# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=xxxxx       # Storefront API access token (public)
SHOPIFY_ADMIN_TOKEN=xxxxx            # Admin API access token (private, server-only)
SHOPIFY_WEBHOOK_SECRET=xxxxx         # Webhook HMAC verification secret
SHOPIFY_API_VERSION=2024-01          # Storefront/Admin API version

# Service Configuration
PORT=3030
NODE_ENV=development
SERVICE_NAME=shopping-cart

# DAL Connection
DAL_GRPC_HOST=dal-service
DAL_GRPC_PORT=4000

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=shopping-cart

# Product Sync Schedule
PRODUCT_SYNC_CRON=0 3 * * *         # 每日 03:00 全量同步
```

---

## 12. Design Decisions

| 決策 | 選擇 | 理由 |
|------|------|------|
| 電商引擎 | Shopify Headless | PCI DSS 免責、庫存/訂單成熟度高、快速上線 |
| 前端 → Shopify | 直連 Storefront API | 減少延遲、減少我方維運成本 |
| 付款 | Shopify Payments | 不自建付款，免 PCI DSS 合規成本 |
| 商品資料 | Shopify metafields | 五行/脈輪/情緒屬性透過 metafield 管理 |
| 推薦引擎 | Graph + Vector | 五行/星座用 Graph 走關聯查詢；情緒用 Vector 走語意匹配 |
| shop_db | 精簡至 2 tables | 不再自建 product/cart/order；僅保留帳號映射和 webhook 日誌 |
| Webhook 冪等 | webhook_event_log + unique ID | Shopify 可能重複發送 webhook |
| Product Sync | Reactive + Daily Full Sync | webhook 即時同步 + 每日全量校正 |
| 結帳體驗 | Shopify Checkout | 託管結帳頁，支援多付款方式、地址驗證、稅務計算 |
