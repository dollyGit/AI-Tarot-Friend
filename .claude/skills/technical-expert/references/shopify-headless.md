# Shopify Headless Integration Patterns

## Architecture Principle

Shopify owns the commerce engine (catalog, cart, checkout, payments, fulfillment).
We own the domain intelligence (crystal recommendations, behavior tracking, graph enrichment).

## Webhook → Kafka Event Mapping

| Shopify Webhook Topic | HMAC Header | Internal Event Type | Kafka Topic | DAL Writes |
|----------------------|-------------|-------------------|-------------|------------|
| `orders/create` | `X-Shopify-Hmac-Sha256` | ORDER_CREATED | `order.placed` | ① finance_record, ② visit_logs, ④ spending, ⑥ PURCHASED edge |
| `orders/paid` | same | ORDER_PAID | `order.paid` | ① finance_record status update |
| `orders/fulfilled` | same | ORDER_FULFILLED | `order.shipped` | ② activity_events |
| `orders/cancelled` | same | ORDER_CANCELLED | `order.cancelled` | ① finance_record reversal |
| `refunds/create` | same | REFUND_CREATED | `order.refunded` | ① finance_record (negative) |
| `products/update` | same | PRODUCT_UPDATED | `product.synced` | ⑥ Crystal node + ELEMENT_MATCHES edges |
| `products/delete` | same | PRODUCT_DELETED | `product.removed` | ⑥ Soft-delete Crystal node |
| `checkouts/create` | same | CHECKOUT_STARTED | `cart.checkout_started` | ② activity_events |

## HMAC Verification Pattern

```typescript
import crypto from 'crypto';

function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}
```

Always use `timingSafeEqual` to prevent timing attacks.

## Idempotency Check

```sql
-- Before processing any webhook:
INSERT INTO webhook_event_log (shopify_webhook_id, topic, payload, status)
VALUES ($1, $2, $3, 'processing')
ON CONFLICT (shopify_webhook_id) DO NOTHING
RETURNING id;

-- If no row returned → duplicate, skip processing
-- After success:
UPDATE webhook_event_log SET status = 'completed' WHERE shopify_webhook_id = $1;
```

## Crystal Metafield Schema

Shopify Admin API metafield definitions for crystal products:

| Namespace.Key | Type | Example Value | Graph DB Property |
|---------------|------|---------------|-------------------|
| `crystal.wuxing_element` | `single_line_text` | `"水"` | Crystal.wuxing_element |
| `crystal.wuxing_support` | `list.single_line_text` | `["金", "木"]` | ELEMENT_MATCHES edges |
| `crystal.healing_properties` | `list.single_line_text` | `["安神", "淨化", "能量"]` | Crystal.healing_properties |
| `crystal.chakra` | `single_line_text` | `"心輪"` | Crystal.chakra |
| `crystal.chakra_secondary` | `single_line_text` | `"喉輪"` | Crystal.chakra_secondary |
| `crystal.zodiac_affinity` | `list.single_line_text` | `["雙魚座", "巨蟹座"]` | ZODIAC_AFFINITY edges |
| `crystal.emotion_tags` | `list.single_line_text` | `["焦慮", "失眠", "平靜"]` | Crystal.emotion_tags |
| `crystal.mineral_name` | `single_line_text` | `"紫水晶 Amethyst"` | Crystal.mineral_name |
| `crystal.hardness` | `number_decimal` | `7.0` | Crystal.hardness |
| `crystal.origin` | `single_line_text` | `"巴西"` | Crystal.origin |

## Product Sync: Admin API → Graph DB

```
Shopify products/update webhook
  → Extract product + metafields
  → Upsert Crystal node in Neo4j:
      MERGE (c:Crystal {shopify_id: $shopify_id})
      SET c.name = $name, c.wuxing_element = $element, ...
  → Create ELEMENT_MATCHES edges:
      MATCH (c:Crystal {shopify_id: $id})
      MATCH (e:BaziElement {name: $support_element})
      MERGE (c)-[:ELEMENT_MATCHES]->(e)
  → Invalidate recommendation cache
```

## Crystal Recommendation Engine

Three recommendation strategies, weighted and combined:

### Strategy 1: Five-Element Matching (五行相生)

```cypher
MATCH (cust:Customer {id: $customer_id})
WHERE cust.bazi_day_master IS NOT NULL
WITH cust.bazi_day_master AS dayMaster
// Find supporting elements for day master
MATCH (crystal:Crystal)-[:ELEMENT_MATCHES]->(elem:BaziElement)
WHERE elem.name IN supportingElements(dayMaster)
RETURN crystal, count(elem) AS match_score
ORDER BY match_score DESC LIMIT 10
```

### Strategy 2: Emotion-Based

```cypher
// Get recent emotions from last 3 readings
MATCH (cust:Customer {id: $customer_id})-[:FELT]->(emotion:Emotion)
WITH collect(DISTINCT emotion.name) AS recent_emotions
MATCH (crystal:Crystal)
WHERE any(tag IN crystal.emotion_tags WHERE tag IN recent_emotions)
RETURN crystal
```

### Strategy 3: Zodiac-Based

```cypher
MATCH (cust:Customer {id: $customer_id})
MATCH (crystal:Crystal)-[:ZODIAC_AFFINITY]->(z:ZodiacSign {name: cust.zodiac_sign})
RETURN crystal
```

### Combined Scoring

```
final_score = wuxing_score × 0.40 + emotion_score × 0.35 + zodiac_score × 0.25
```

Cache result for 10 minutes per customer.

## Storefront API vs Admin API Boundaries

| Operation | API | Who Calls |
|-----------|-----|-----------|
| Browse products | Storefront API | Frontend (direct) |
| Add to cart | Storefront Cart API | Frontend (direct) |
| Checkout | Shopify Checkout | Frontend (redirect) |
| Read product metafields | Admin API | ShoppingCart service (server-side) |
| Sync products to Graph | Admin API | ShoppingCart sync worker |
| Process webhooks | Webhook endpoint | Shopify (push) |
| Crystal recommendations | Our REST API | Frontend (via API Gateway) |
