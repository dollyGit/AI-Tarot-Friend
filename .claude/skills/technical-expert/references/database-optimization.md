# Database Optimization Guide

## PostgreSQL Index Strategy

### customer table (CustomerManagement)
```sql
CREATE UNIQUE INDEX idx_customer_email ON customer(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_customer_line_id ON customer(line_id) WHERE line_id IS NOT NULL;
CREATE INDEX idx_customer_zodiac ON customer(zodiac_sign);
CREATE INDEX idx_customer_wuxing ON customer(wuxing_day_master);
CREATE INDEX idx_customer_status ON customer(status) WHERE status = 'active';
CREATE INDEX idx_customer_created ON customer(created_at DESC);
```

### customer_contact table
```sql
CREATE INDEX idx_contact_customer ON customer_contact(customer_id);
CREATE INDEX idx_contact_relationship ON customer_contact(customer_id, relationship_type);
```

### finance_record table
```sql
CREATE INDEX idx_finance_customer ON finance_record(customer_id);
CREATE INDEX idx_finance_customer_date ON finance_record(customer_id, created_at DESC);
CREATE INDEX idx_finance_type ON finance_record(transaction_type);
-- Partial index for pending transactions
CREATE INDEX idx_finance_pending ON finance_record(status) WHERE status = 'pending';
```

### tarot_draws table (TarotReading)
```sql
CREATE INDEX idx_draw_session ON tarot_draws(session_id);
CREATE INDEX idx_draw_created ON tarot_draws(created_at DESC);
```

### cards table (TarotReading)
```sql
CREATE UNIQUE INDEX idx_card_order ON cards("order");
-- Cards are heavily cached (24hr) so index pressure is low
```

### caring_plan table (CaringService)
```sql
CREATE INDEX idx_plan_customer ON caring_plan(customer_id);
CREATE INDEX idx_plan_next_trigger ON caring_plan(next_trigger_at) WHERE status = 'active';
CREATE INDEX idx_plan_type ON caring_plan(type, status);
```

### appointments table (TarotistScheduler)
```sql
CREATE INDEX idx_appt_tarotist_time ON appointment(tarotist_id, start_at);
CREATE INDEX idx_appt_customer ON appointment(customer_id);
CREATE INDEX idx_appt_status ON appointment(status) WHERE status IN ('pending', 'confirmed');
```

---

## MongoDB Index Strategy

### visit_logs collection
```javascript
// Compound index for customer + time range queries
db.visit_logs.createIndex({ customer_id: 1, created_at: -1 });
// TTL index: auto-delete after 1 year
db.visit_logs.createIndex({ created_at: 1 }, { expireAfterSeconds: 365 * 86400 });
```

### activity_events collection
```javascript
db.activity_events.createIndex({ customer_id: 1, event_type: 1, created_at: -1 });
// TTL: 6 months
db.activity_events.createIndex({ created_at: 1 }, { expireAfterSeconds: 180 * 86400 });
```

### divination_charts collection
```javascript
// Polymorphic: astrology, bazi, ziwei, synastry
db.divination_charts.createIndex({ customer_id: 1, chart_type: 1 });
db.divination_charts.createIndex({ "reference.customer_birth_chart_id": 1 });
```

### conversation_raw collection
```javascript
db.conversation_raw.createIndex({ session_id: 1 });
db.conversation_raw.createIndex({ customer_id: 1, created_at: -1 });
// TTL: 3 years
db.conversation_raw.createIndex({ created_at: 1 }, { expireAfterSeconds: 3 * 365 * 86400 });
```

### customer_behavior_profile collection
```javascript
// One document per customer, updated periodically
db.customer_behavior_profile.createIndex({ customer_id: 1 }, { unique: true });
```

---

## InfluxDB Retention & Downsampling

### Retention Policies
```
raw_data:     90 days    (full resolution, every data point)
hourly_data:  365 days   (aggregated: mean, min, max per hour)
daily_data:   3 years    (aggregated: mean, min, max per day)
```

### Downsampling Tasks (Flux)
```flux
// Hourly downsampling (runs every hour)
option task = {name: "downsample_hourly", every: 1h}
from(bucket: "raw_data")
  |> range(start: -2h)
  |> filter(fn: (r) => r._measurement == "customer_sentiment")
  |> aggregateWindow(every: 1h, fn: mean)
  |> to(bucket: "hourly_data")

// Daily downsampling (runs daily)
option task = {name: "downsample_daily", every: 1d}
from(bucket: "hourly_data")
  |> range(start: -2d)
  |> filter(fn: (r) => r._measurement == "customer_sentiment")
  |> aggregateWindow(every: 1d, fn: mean)
  |> to(bucket: "daily_data")
```

### Key Measurements
| Measurement | Tags | Fields | Write Frequency |
|-------------|------|--------|-----------------|
| `customer_engagement` | service, channel, action_type | count (int) | Per interaction |
| `customer_spending` | category, payment_method | amount (float) | Per transaction |
| `customer_sentiment` | source (reading/caring/manual) | score (float), label (string) | Per reading |

---

## Qdrant Collection Configuration

### conversation_summaries
```json
{
  "collection_name": "conversation_summaries",
  "vectors": { "size": 1536, "distance": "Cosine" },
  "optimizers_config": { "indexing_threshold": 10000 },
  "replication_factor": 1,
  "write_consistency_factor": 1
}
```

Payload schema: `{customer_id, session_id, summary_text, sentiment_label, key_topics[], key_people[], emotion_tags[], created_at}`

### long_term_memory
```json
{
  "collection_name": "long_term_memory",
  "vectors": { "size": 1536, "distance": "Cosine" },
  "optimizers_config": { "indexing_threshold": 5000 }
}
```

Payload schema: `{customer_id, memory_text, life_area, scope, importance_score, last_accessed, created_at}`

### Search Best Practices
- Always filter by `customer_id` (payload filter, not vector)
- Use `score_threshold`: 0.72 for summaries, 0.68 for long-term memory
- Limit: 5 for summaries, 3 for long-term memory
- Update `last_accessed` on retrieval (for decay scoring)

---

## Neo4j Index & Optimization

### Node Indexes
```cypher
CREATE INDEX customer_id FOR (c:Customer) ON (c.id);
CREATE INDEX person_name FOR (p:Person) ON (p.name);
CREATE INDEX crystal_shopify FOR (cr:Crystal) ON (cr.shopify_id);
CREATE INDEX event_date FOR (e:Event) ON (e.occurred_at);
CREATE INDEX zodiac_name FOR (z:ZodiacSign) ON (z.name);
CREATE INDEX bazi_name FOR (b:BaziElement) ON (b.name);
```

### Cypher Query Tips
1. Always start MATCH from indexed node
2. Use `WITH` to reduce intermediate result sets
3. Limit traversal depth: `MATCH path = (c)-[*1..3]-(target)`
4. Use `OPTIONAL MATCH` for nullable relationships
5. Prefer `MERGE` over `CREATE` to avoid duplicates
6. Use parameterized queries to leverage query cache

---

## Redis Memory Optimization

- Use `EXPIRE` on all keys (no orphaned keys)
- Session keys: 30min sliding TTL (reset on activity)
- Presence keys: 5min TTL (heartbeat refresh)
- Working memory: Session lifetime TTL
- Use `SCAN` instead of `KEYS *` in production
- Monitor memory: `INFO memory` → track `used_memory_rss`
- Set `maxmemory-policy allkeys-lru` for cache nodes

---

## Connection Pool Sizing Formula

```
pool_size = (core_count * 2) + effective_spindle_count
```

For cloud deployments (no spindles):
```
pool_size = core_count * 2 + 1  (minimum 5, maximum 20 per service)
```
