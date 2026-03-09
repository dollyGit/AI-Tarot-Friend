# Storage Engine Query Patterns

## PostgreSQL Query Patterns

### Customer Profile (customer_db)

```sql
-- Full customer profile with contacts
SELECT c.*,
  json_agg(DISTINCT jsonb_build_object(
    'id', cc.id, 'nickname', cc.nickname,
    'relationship_type', cc.relationship_type,
    'zodiac_sign', cc.zodiac_sign
  )) FILTER (WHERE cc.id IS NOT NULL) AS contacts,
  json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) AS tags
FROM customer c
LEFT JOIN customer_contact cc ON cc.customer_id = c.id
LEFT JOIN customer_tag ct ON ct.customer_id = c.id
LEFT JOIN tag t ON t.id = ct.tag_id
WHERE c.id = $1 AND c.status = 'active'
GROUP BY c.id;
```

```sql
-- Financial summary
SELECT
  COUNT(*) AS total_transactions,
  SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) AS total_purchases,
  SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) AS total_refunds,
  AVG(amount) FILTER (WHERE type = 'purchase') AS avg_order_value,
  MAX(created_at) AS last_transaction_at
FROM finance_record
WHERE customer_id = $1;
```

```sql
-- Consent check (required before data processing)
SELECT consent_type, granted, granted_at, revoked_at
FROM customer_consent
WHERE customer_id = $1
  AND revoked_at IS NULL
ORDER BY granted_at DESC;
```

### Tarot Data (tarot_db)

```sql
-- Recent sessions with draws
SELECT s.id, s.channel, s.sentiment, s.topic_tags, s.created_at,
  json_agg(jsonb_build_object(
    'spread_type', td.spread_type,
    'cards', td.cards,
    'interpretation', td.interpretation
  ) ORDER BY td.created_at) AS draws
FROM sessions s
LEFT JOIN tarot_draws td ON td.session_id = s.id
WHERE s.user_id = $1
GROUP BY s.id
ORDER BY s.created_at DESC
LIMIT 10;
```

```sql
-- Card frequency analysis
SELECT
  (card_elem->>'card_id')::int AS card_id,
  cards.name_zh,
  cards.name_en,
  COUNT(*) AS draw_count,
  SUM(CASE WHEN card_elem->>'orientation' = 'reversed' THEN 1 ELSE 0 END) AS reversed_count
FROM tarot_draws,
  jsonb_array_elements(cards) AS card_elem
JOIN cards ON cards.order = (card_elem->>'card_id')::int - 1
WHERE session_id IN (SELECT id FROM sessions WHERE user_id = $1)
GROUP BY (card_elem->>'card_id')::int, cards.name_zh, cards.name_en
ORDER BY draw_count DESC
LIMIT 20;
```

---

## MongoDB Query Patterns

### Visit Logs

```javascript
// Recent visits with aggregation
db.visit_logs.aggregate([
  { $match: { customer_id: customerId, created_at: { $gte: thirtyDaysAgo } } },
  { $sort: { created_at: -1 } },
  { $group: {
    _id: "$service",
    visit_count: { $sum: 1 },
    last_visit: { $first: "$created_at" },
    pages: { $addToSet: "$page" }
  }},
  { $sort: { visit_count: -1 } }
]);
```

### Activity Events

```javascript
// User activity pattern (hourly distribution)
db.activity_events.aggregate([
  { $match: { customer_id: customerId, created_at: { $gte: ninetyDaysAgo } } },
  { $group: {
    _id: { $hour: "$created_at" },
    count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```

### Divination Charts (Polymorphic)

```javascript
// Get all charts for a customer (astrology, bazi, ziwei)
db.divination_charts.find({
  customer_id: customerId,
  chart_type: { $in: ["astrology", "bazi", "ziwei"] }
}).sort({ created_at: -1 });

// Get synastry chart between two people
db.divination_charts.findOne({
  chart_type: "synastry",
  "reference.customer_birth_chart_id": chartId1,
  "reference.contact_birth_chart_id": chartId2
});
```

### Conversation Raw

```javascript
// Get raw conversation for a session
db.conversation_raw.findOne({ session_id: sessionId });

// Search conversations by keyword (full-text)
db.conversation_raw.find({
  customer_id: customerId,
  $text: { $search: "母親 健康" }
}).sort({ score: { $meta: "textScore" } }).limit(5);
```

### Behavior Profile

```javascript
// Get or create behavior profile
db.customer_behavior_profile.findOneAndUpdate(
  { customer_id: customerId },
  {
    $setOnInsert: { customer_id: customerId, created_at: new Date() },
    $set: { updated_at: new Date() }
  },
  { upsert: true, returnDocument: "after" }
);
```

---

## Redis Key Patterns

### Session Management

```
GET    session:{session_id}                    → Session JSON (TTL 30min sliding)
HGETALL customer:sessions:{customer_id}        → All active sessions
GET    presence:{customer_id}                  → "online" (TTL 5min heartbeat)
```

### Working Memory

```
GET    conversation:working:{session_id}       → Working memory JSON
SET    conversation:working:{session_id} {...} EX 1800  → 30min TTL
DEL    conversation:working:{session_id}       → Clear on session end
```

### Rate Limiting

```
INCR   ratelimit:{customer_id}:readings:{window}
EXPIRE ratelimit:{customer_id}:readings:{window} 60
GET    ratelimit:{customer_id}:readings:{window}  → Current count
```

### Counters & Stats

```
PFADD  customer:daily_active {customer_id}     → HyperLogLog DAU
PFCOUNT customer:daily_active                  → Approximate DAU count
ZADD   customer:online {timestamp} {id}        → Sorted set for online ranking
```

---

## InfluxDB Flux Query Patterns

### Sentiment Time-Series

```flux
// Current sentiment (latest point)
from(bucket: "raw_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "customer_sentiment")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> last()

// Weekly sentiment average for trend detection
from(bucket: "hourly_data")
  |> range(start: -90d)
  |> filter(fn: (r) => r._measurement == "customer_sentiment")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> aggregateWindow(every: 1w, fn: mean, createEmpty: false)

// Sentiment volatility (standard deviation)
from(bucket: "hourly_data")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "customer_sentiment")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> aggregateWindow(every: 1w, fn: stddev, createEmpty: false)
```

### Engagement Metrics

```flux
// Engagement by channel
from(bucket: "daily_data")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "customer_engagement")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> group(columns: ["channel"])
  |> sum()

// Session frequency trend
from(bucket: "daily_data")
  |> range(start: -180d)
  |> filter(fn: (r) => r._measurement == "customer_engagement")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> filter(fn: (r) => r.action_type == "session_start")
  |> aggregateWindow(every: 1mo, fn: count, createEmpty: true)
  |> fill(value: 0)
```

---

## Qdrant Search Patterns

### Conversation Summaries Search

```json
POST /collections/conversation_summaries/points/search
{
  "vector": [0.123, 0.456, ...],
  "filter": {
    "must": [
      { "key": "customer_id", "match": { "value": "uuid-here" } }
    ]
  },
  "limit": 5,
  "score_threshold": 0.72,
  "with_payload": true
}
```

### Long-Term Memory Search

```json
POST /collections/long_term_memory/points/search
{
  "vector": [0.789, 0.012, ...],
  "filter": {
    "must": [
      { "key": "customer_id", "match": { "value": "uuid-here" } }
    ],
    "should": [
      { "key": "life_area", "match": { "value": "family" } }
    ]
  },
  "limit": 3,
  "score_threshold": 0.68,
  "with_payload": true
}
```

### Update last_accessed on Retrieval

```json
PUT /collections/long_term_memory/points/payload
{
  "points": ["point-id-1", "point-id-2"],
  "payload": {
    "last_accessed": "2024-02-01T14:00:00Z"
  }
}
```

---

## Neo4j Cypher Patterns

### Customer Relationship Graph

```cypher
// Full 1-hop network
MATCH (c:Customer {id: $customer_id})-[r]->(target)
WHERE type(r) IN ['KNOWS', 'INTERESTED_IN', 'FEELS', 'HAD_READING']
RETURN c, r, target
ORDER BY r.strength DESC
LIMIT 50
```

### People & Events

```cypher
// People with their associated events (last 30 days)
MATCH (c:Customer {id: $customer_id})-[k:KNOWS]->(p:Person)
OPTIONAL MATCH (p)-[:INVOLVED_IN]->(e:Event)
  WHERE e.occurred_at > datetime() - duration('P30D')
RETURN p.name, p.relationship_to_customer, k.strength,
  collect(DISTINCT {description: e.description, date: e.occurred_at}) AS recent_events
ORDER BY k.strength DESC
```

### Topic Co-occurrence

```cypher
// Topics that frequently appear together
MATCH (c:Customer {id: $customer_id})-[:INTERESTED_IN]->(t1:Topic)
MATCH (c)-[:INTERESTED_IN]->(t2:Topic)
WHERE t1 <> t2
MATCH (t1)-[co:CORRELATES_WITH]-(t2)
RETURN t1.name, t2.name, co.count AS co_occurrence
ORDER BY co.count DESC
LIMIT 10
```

### Card Draw Patterns

```cypher
// Cards drawn more than once (recurring cards)
MATCH (c:Customer {id: $customer_id})-[:HAD_READING]->(s:ReadingSession)-[:DREW]->(card:TarotCard)
WITH card, count(s) AS times_drawn, collect(s.created_at) AS draw_dates
WHERE times_drawn >= 2
RETURN card.name, times_drawn, draw_dates
ORDER BY times_drawn DESC
```
