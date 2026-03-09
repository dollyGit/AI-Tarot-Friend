---
name: data-processing-expert
description: >
  TarotFriend CRM 數據處理專家。負責六種儲存引擎資料收集（PostgreSQL, MongoDB, Redis, InfluxDB,
  Qdrant, Neo4j）、三層記憶體架構（Working → Summary → Long-term）、使用者時間軸建構、
  人物關係圖譜分析、情緒趨勢追蹤、RAG 語意檢索、行為畫像聚合。當工作涉及 CRM 資料準備、
  使用者歷史紀錄、事件時間軸、人物關係、情緒分析數據、記憶體管道時，務必使用此技能。
  CRM data processing expert for TarotFriend. Use for user history aggregation, event timeline
  construction, relationship graph mapping, emotional trend tracking, three-layer memory architecture
  (Working/Summary/Long-term), RAG semantic retrieval, behavioral profiling, and 6-storage-engine
  data collection. Always invoke when preparing user context, querying across storage types,
  building timelines, analyzing relationships, or working with memory pipelines.
---

# Data Processing Expert — TarotFriend 數據處理專家

## When to Use

Invoke this skill when:
- Preparing complete user context for AI interpretation
- Querying data across any of the 6 storage engines
- Building user event timelines
- Analyzing relationship graphs (Neo4j)
- Tracking emotional trends over time (InfluxDB)
- Working with the three-layer memory architecture
- Implementing RAG retrieval pipelines
- Aggregating behavioral profiles
- Designing data pipelines between storage engines
- Optimizing cross-engine query performance

---

## Six-Storage Data Collection Matrix

Each storage engine serves a specific data role. The Data Processing Expert orchestrates queries across all six.

| Storage | Engine | What to Query | Query Pattern | Return Format |
|---------|--------|---------------|---------------|---------------|
| **Relational** | PostgreSQL | Customer profile, contacts, finance, consent, tags | SQL JOIN with WHERE | Flat JSON object |
| **Document** | MongoDB | Visit logs, activity events, behavior profile, divination charts, conversation raw | Find by customer_id + date range | Array of documents |
| **KV/Cache** | Redis | Session state, working memory, presence, rate limits | GET/HGETALL by key pattern | Key-value pairs |
| **Time-Series** | InfluxDB | Engagement frequency, spending trends, sentiment scores | Flux query with aggregateWindow | Time-bucketed arrays |
| **Vector** | Qdrant | Conversation summaries, long-term memories | ANN search with customer_id filter | Scored result array |
| **Graph** | Neo4j | People network, entity relationships, topic co-occurrence | Cypher traversal | Nodes + edges |

### Query Priority Order (for GetFullCustomerView)

When preparing complete user context, query in this order to meet the < 500ms SLO:

```
Phase 1 — Parallel (instant):
  ├── Redis: GET session + working memory     (~1ms)
  ├── PostgreSQL: SELECT customer profile     (~5ms)
  └── InfluxDB: Latest sentiment score        (~10ms)

Phase 2 — Parallel (fast):
  ├── Qdrant: Top-5 relevant summaries        (~20ms)
  ├── Neo4j: 1-hop relationship graph         (~30ms)
  └── MongoDB: Last 5 visit logs              (~15ms)

Phase 3 — Conditional:
  └── MongoDB: Behavior profile (if stale)    (~10ms)

Total: ~50-80ms (well within 500ms SLO)
```

---

## Three-Layer Memory Architecture

### Layer 1: Working Memory (Redis)

**Purpose**: Current conversation context window
**TTL**: Session lifetime (30min sliding)
**Key pattern**: `conversation:working:{session_id}`

```
Structure:
{
  "messages": [...last N turns...],
  "extracted_entities": ["母親", "工作壓力", "感情"],
  "current_sentiment": -0.3,
  "topic_stack": ["career", "relationship"],
  "mentioned_people": ["母親", "男朋友"]
}
```

**Write trigger**: Every user message
**Read trigger**: Before every AI response generation

### Layer 2: Session Summary (Qdrant — conversation_summaries)

**Purpose**: Compressed summary of each completed session
**Collection**: `conversation_summaries`
**Vector dimension**: 1536 (OpenAI text-embedding-3-small)

```
Payload schema:
{
  "customer_id": "uuid",
  "session_id": "uuid",
  "summary_text": "使用者擔心母親的健康，抽到逆位塔...",
  "sentiment_label": "negative",
  "sentiment_score": -0.45,
  "key_topics": ["family", "health", "anxiety"],
  "key_people": ["母親"],
  "emotion_tags": ["擔心", "焦慮", "不安"],
  "cards_drawn": ["The Tower (R)", "The Star", "Two of Cups"],
  "spread_type": "3-card",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Write trigger**: Session end → summarize → embed → upsert
**Read trigger**: New session start (retrieve top-5 by semantic similarity)

**Search parameters**:
- Filter: `customer_id` (payload filter, not vector)
- Score threshold: 0.72
- Limit: 5
- Sort: Combined (similarity × recency decay)

### Layer 3: Long-Term Memory (Qdrant — long_term_memory)

**Purpose**: Cross-session aggregated insights about the user
**Collection**: `long_term_memory`
**Vector dimension**: 1536

```
Payload schema:
{
  "customer_id": "uuid",
  "memory_text": "使用者與母親關係緊張，曾多次在占卜中提及...",
  "life_area": "family",       // family/career/romance/health/finance/spiritual
  "scope": "recurring_theme",  // single_event/recurring_theme/life_pattern
  "importance_score": 0.85,    // 0-1, decays over time
  "source_sessions": ["uuid1", "uuid2", "uuid3"],
  "last_accessed": "2024-02-01T14:00:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Write trigger**: After every 3-5 sessions, batch aggregation job
**Read trigger**: New session (retrieve top-3 by importance × similarity)

**Search parameters**:
- Filter: `customer_id`
- Score threshold: 0.68
- Limit: 3
- Update `last_accessed` on retrieval (for decay scoring)

### Memory Pipeline Flow

```
User message arrives
  │
  ├─→ Write to Working Memory (Redis)
  │     └─→ Extract entities → update mentioned_people, topic_stack
  │
  ├─→ (During session) AI reads Working Memory for context
  │
  └─→ Session ends
        │
        ├─→ Summarize conversation → embed → Qdrant (conversation_summaries)
        ├─→ Extract entities → Neo4j (Person, Event, Topic nodes + edges)
        ├─→ Write sentiment score → InfluxDB (customer_sentiment)
        ├─→ Append to conversation_raw → MongoDB
        │
        └─→ Every 3-5 sessions:
              └─→ Aggregate summaries → Long-Term Memory (Qdrant)
                    └─→ Merge similar memories, update importance scores
```

---

## User Timeline Construction

Build a chronological event timeline by merging data from multiple sources:

### Source Mapping

| Timeline Event | Source DB | Query |
|---------------|-----------|-------|
| Reading sessions | PostgreSQL (tarot_db) | `SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC` |
| Card draws | PostgreSQL (tarot_db) | `SELECT * FROM tarot_draws WHERE session_id IN (...)` |
| Visit history | MongoDB | `db.visit_logs.find({customer_id, created_at: {$gte: startDate}})` |
| Activity events | MongoDB | `db.activity_events.find({customer_id, event_type: {$in: types}})` |
| Purchase history | PostgreSQL (customer_db) | `SELECT * FROM finance_record WHERE customer_id = $1` |
| Sentiment over time | InfluxDB | `from(bucket: "hourly_data") \|> filter(fn: (r) => r.customer_id == id)` |
| Appointments | PostgreSQL (scheduler_db) | `SELECT * FROM appointment WHERE customer_id = $1` |
| Caring actions | PostgreSQL (caring_db) | `SELECT * FROM caring_action WHERE customer_id = $1` |

### Timeline Merge Algorithm

```typescript
interface TimelineEvent {
  timestamp: string;       // ISO8601
  source: string;          // 'reading' | 'visit' | 'purchase' | 'appointment' | 'caring'
  event_type: string;      // specific type within source
  summary: string;         // human-readable summary
  sentiment_at_time?: number;  // sentiment score at that point
  related_people?: string[];   // people mentioned
  metadata: Record<string, any>;
}

// Merge algorithm:
// 1. Query all sources in parallel (Phase 1 + Phase 2 pattern)
// 2. Normalize each result into TimelineEvent format
// 3. Sort by timestamp DESC
// 4. Enrich with sentiment from InfluxDB (nearest-time join)
// 5. Paginate: default 20 events per page, cursor-based
```

---

## Relationship Graph (Neo4j)

### Node Types

| Node Label | Properties | Source |
|-----------|-----------|--------|
| `Customer` | id, name, zodiac_sign, bazi_day_master | PostgreSQL customer |
| `Person` | id, name, relationship_to_customer, zodiac_sign | PostgreSQL customer_contact |
| `Event` | id, description, occurred_at, life_area | Extracted from conversations |
| `Topic` | id, name, category | Extracted from conversations |
| `Emotion` | id, name, valence | Sentiment analysis |
| `TarotCard` | id, name, arcana_type | PostgreSQL cards |
| `ReadingSession` | id, created_at, spread_type | PostgreSQL sessions |
| `Crystal` | shopify_id, name, wuxing_element | Shopify sync |
| `ZodiacSign` | name | Static reference |
| `BaziElement` | name | Static reference |

### Edge Types & Strength Calculation

| Edge | Between | Strength Formula |
|------|---------|-----------------|
| `KNOWS` | Customer → Person | 0.30 × frequency + 0.25 × recency + 0.25 × sentiment_impact + 0.20 × topic_diversity |
| `INTERESTED_IN` | Customer → Topic | mention_count / total_sessions (normalized) |
| `FEELS` | Customer → Emotion | Latest sentiment analysis output |
| `HAD_READING` | Customer → ReadingSession | 1.0 (binary) |
| `DREW` | ReadingSession → TarotCard | 1.0 (binary, includes position + orientation) |
| `INVOLVED_IN` | Person → Event | Extracted from conversation |
| `EXPERIENCED` | Customer → Event | Extracted from conversation |
| `CORRELATES_WITH` | Topic → Topic | Co-occurrence count / max co-occurrence |
| `PURCHASED` | Customer → Crystal | From order events |
| `ELEMENT_MATCHES` | Crystal → BaziElement | From Shopify metafields |
| `ZODIAC_AFFINITY` | Crystal → ZodiacSign | From Shopify metafields |

### Relationship Strength Algorithm

```
strength = w_freq × frequency_score + w_rec × recency_score
         + w_sent × sentiment_impact + w_div × topic_diversity

Where:
  w_freq = 0.30  (how often this person appears)
  w_rec  = 0.25  (how recently mentioned)
  w_sent = 0.25  (emotional intensity when discussing)
  w_div  = 0.20  (variety of contexts mentioned in)

frequency_score = mention_count / max_mention_count_across_all_contacts
recency_score   = 1.0 / (1 + days_since_last_mention / 30)
sentiment_impact = abs(avg_sentiment_when_mentioned)
topic_diversity  = unique_topics_mentioned_with / total_unique_topics
```

### Key Cypher Queries

**Get customer's relationship network (1-hop)**:
```cypher
MATCH (c:Customer {id: $customer_id})-[r:KNOWS]->(p:Person)
OPTIONAL MATCH (p)-[:INVOLVED_IN]->(e:Event)
RETURN p, r.strength AS strength, collect(DISTINCT e) AS events
ORDER BY r.strength DESC
LIMIT 10
```

**Find recurring themes across sessions**:
```cypher
MATCH (c:Customer {id: $customer_id})-[:HAD_READING]->(s:ReadingSession)-[:DREW]->(card:TarotCard)
WITH c, card, count(s) AS draw_count
WHERE draw_count >= 2
RETURN card.name, draw_count
ORDER BY draw_count DESC
```

**Get people mentioned in emotional context**:
```cypher
MATCH (c:Customer {id: $customer_id})-[:FEELS]->(em:Emotion {valence: 'negative'})
MATCH (c)-[:KNOWS]->(p:Person)-[:INVOLVED_IN]->(ev:Event)
WHERE ev.occurred_at > datetime() - duration('P30D')
RETURN p.name, p.relationship_to_customer, collect(em.name) AS emotions
```

---

## Emotional Trend Analysis (InfluxDB)

### Querying Sentiment Time-Series

```flux
// Get sentiment trend for last 30 days (daily average)
from(bucket: "daily_data")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "customer_sentiment")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
  |> yield(name: "daily_sentiment")
```

```flux
// Detect sentiment decline (3-day moving average drop)
from(bucket: "hourly_data")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "customer_sentiment")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> timedMovingAverage(every: 1d, period: 3d)
  |> derivative(unit: 1d, nonNegative: false)
  |> filter(fn: (r) => r._value < -0.15)  // Alert threshold
  |> yield(name: "sentiment_decline")
```

### Engagement Frequency

```flux
// Engagement frequency (sessions per week, last 3 months)
from(bucket: "daily_data")
  |> range(start: -90d)
  |> filter(fn: (r) => r._measurement == "customer_engagement")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> aggregateWindow(every: 1w, fn: sum, createEmpty: true)
  |> fill(value: 0)
  |> yield(name: "weekly_engagement")
```

### Spending Trends

```flux
// Monthly spending trend
from(bucket: "daily_data")
  |> range(start: -365d)
  |> filter(fn: (r) => r._measurement == "customer_spending")
  |> filter(fn: (r) => r.customer_id == "${customer_id}")
  |> aggregateWindow(every: 1mo, fn: sum, createEmpty: true)
  |> fill(value: 0.0)
  |> yield(name: "monthly_spending")
```

---

## Standardized Output Format

The Data Processing Expert produces a standardized JSON context object that feeds into the Psychology Expert and Tarot Expert:

```json
{
  "customer_profile": {
    "id": "uuid",
    "display_name": "小芳",
    "zodiac_sign": "雙魚座",
    "chinese_zodiac": "兔",
    "bazi_day_master": "癸",
    "membership_tier": "gold",
    "preferred_reading_style": "psychological",
    "locale": "zh-TW"
  },
  "current_session": {
    "sentiment": { "score": -0.3, "label": "negative", "crisis_level": "none" },
    "working_memory": {
      "messages": ["...last 5 turns..."],
      "extracted_entities": ["母親", "工作"],
      "topic_stack": ["family", "career"]
    }
  },
  "memory_context": {
    "relevant_summaries": [
      {
        "summary": "上次討論了與母親的關係...",
        "similarity_score": 0.85,
        "session_date": "2024-01-10",
        "emotion_tags": ["焦慮", "內疚"]
      }
    ],
    "long_term_insights": [
      {
        "memory": "使用者與母親關係持續緊張，這是反覆出現的主題",
        "life_area": "family",
        "importance": 0.85
      }
    ]
  },
  "relationship_graph": {
    "key_people": [
      {
        "name": "母親",
        "relationship": "母女",
        "strength": 0.92,
        "recent_context": "健康問題",
        "sentiment_when_mentioned": -0.4
      }
    ],
    "recurring_themes": ["family_tension", "career_uncertainty"]
  },
  "emotional_trend": {
    "current_score": -0.3,
    "7d_average": -0.15,
    "30d_trend": "declining",
    "trend_direction": -0.08,
    "alert_level": "watch"
  },
  "engagement_summary": {
    "total_sessions": 23,
    "sessions_this_month": 4,
    "avg_sessions_per_week": 1.2,
    "days_since_last_visit": 3,
    "lifetime_value_twd": 2400
  }
}
```

---

## RAG Retrieval Pattern

When a new session starts, retrieve relevant context:

```
Step 1: Get current working memory (Redis)
  └── If exists: extract topic keywords for semantic search

Step 2: Semantic search on Qdrant (conversation_summaries)
  ├── Query: embed(current_user_message)
  ├── Filter: customer_id = X
  ├── Score threshold: 0.72
  ├── Limit: 5
  └── Return: summary_text + emotion_tags + key_people

Step 3: Semantic search on Qdrant (long_term_memory)
  ├── Query: embed(current_user_message)
  ├── Filter: customer_id = X
  ├── Score threshold: 0.68
  ├── Limit: 3
  └── Return: memory_text + life_area + importance_score

Step 4: Graph context (Neo4j)
  ├── For each person mentioned in working memory:
  │   └── MATCH (c)-[:KNOWS]->(p:Person {name: $name})
  │       RETURN p, relationship, strength, recent_events
  └── For current topic:
      └── MATCH (c)-[:INTERESTED_IN]->(t:Topic {name: $topic})
          RETURN related topics, frequency

Step 5: Compose context JSON → feed to Psychology Expert
```

---

## Entity Extraction Pipeline

After each session, extract structured entities from conversation:

### Extraction Targets

| Entity Type | Example | Storage Destination |
|------------|---------|-------------------|
| Person | "母親", "男朋友小陳" | Neo4j Person node |
| Event | "上週跟老闆吵架" | Neo4j Event node |
| Topic | "工作", "感情", "健康" | Neo4j Topic node |
| Emotion | "焦慮", "開心", "不安" | Neo4j Emotion node + InfluxDB |
| Location | "台北", "公司" | Metadata in Event |
| Time reference | "上週", "去年" | Event.occurred_at |

### Extraction Method

- **Primary**: LLM extraction (gpt-4o-mini, max 200 tokens)
- **Fallback**: Rule-based keyword matching
- **Post-processing**: Deduplicate, resolve coreferences, normalize names

---

## Behavioral Profile Aggregation (MongoDB)

The `customer_behavior_profile` document is updated periodically:

```json
{
  "customer_id": "uuid",
  "updated_at": "2024-02-01T00:00:00Z",
  "reading_patterns": {
    "preferred_spread": "3-card",
    "avg_sessions_per_month": 4.2,
    "peak_hours": [21, 22],
    "peak_days": ["Sunday", "Wednesday"],
    "common_topics": ["career", "family", "romance"]
  },
  "emotional_baseline": {
    "avg_sentiment": -0.05,
    "sentiment_variance": 0.25,
    "typical_crisis_level": "none",
    "emotion_distribution": {
      "焦慮": 0.30, "期待": 0.20, "困惑": 0.15,
      "開心": 0.15, "擔心": 0.10, "平靜": 0.10
    }
  },
  "relationship_focus": {
    "most_discussed_people": [
      {"name": "母親", "mention_count": 12, "avg_sentiment": -0.3},
      {"name": "男朋友", "mention_count": 8, "avg_sentiment": 0.1}
    ]
  },
  "purchase_behavior": {
    "total_spend_twd": 2400,
    "avg_order_value": 800,
    "preferred_crystals": ["紫水晶", "月光石"],
    "last_purchase_date": "2024-01-20"
  }
}
```

**Update schedule**: Every 24 hours (batch job), or triggered by significant events

---

## Key File References

- Customer schema: `/Users/martinlee/Projects/TarotFriend/CustomerManagement/CUSTOMER_SCHEMA.md`
- Architecture: `/Users/martinlee/Projects/TarotFriend/ARCHITECTURE.md`
- Prisma schema: `/Users/martinlee/Projects/TarotFriend/TarotReading/backend/prisma/schema.prisma`
- DAL design: See `technical-expert` skill for DAL patterns

For deeper dives, read the `references/` files in this skill directory.

---

## Anti-Patterns

1. **Sequential cross-engine queries** — Always parallelize independent queries (Phase 1 + Phase 2 pattern)
2. **Unbounded vector search** — Always filter by customer_id and use score_threshold
3. **Stale working memory** — Clear Redis working memory when session ends, don't let it persist
4. **Missing entity deduplication** — "母親" and "媽媽" must resolve to the same Person node
5. **Ignoring decay** — Long-term memories must decay in importance over time if not accessed
6. **Over-fetching** — Don't query all 6 engines when only 2-3 are needed for the current task
7. **Raw text in context** — Always summarize/structure data before passing to AI; raw conversation logs waste tokens

---

## Integration with Other Skills

- **Technical Expert**: Provides DAL query routing and cache strategy
- **Tarot Expert**: Receives card draw context + enriched user context
- **Psychology Expert**: Primary consumer — receives the standardized output JSON
- **Customer Service Agent**: Consumes engagement summary + emotional trend for trigger evaluation
