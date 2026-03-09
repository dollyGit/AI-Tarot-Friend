# Data Model: AI Tarot Friend

**Feature**: 001-tarot-reading
**Date**: 2025-10-08
**Database**: PostgreSQL 16 with pgvector extension

## Entity Relationship Overview

```
users 1────∞ sessions 1────∞ tarot_draws
  │                │
  │                └──────∞ memories (with vector embeddings)
  │
  ├──────1 subscriptions (active)
  ├──────∞ nudges (outreach messages)
  └──────∞ audit_logs

plans 1────∞ subscriptions

cards (static reference data, 78 records)
spreads (static reference data, 3-5 records)
```

## Core Tables

### users

Stores user accounts with authentication and preferences.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  line_id VARCHAR(100) UNIQUE,
  display_name VARCHAR(100),
  locale VARCHAR(10) NOT NULL DEFAULT 'zh-TW', -- 'zh-TW' | 'en'
  preferred_channel VARCHAR(20) DEFAULT 'email', -- 'email' | 'line'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'deleted'

  CONSTRAINT check_contact_method CHECK (email IS NOT NULL OR line_id IS NOT NULL)
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_line_id ON users(line_id) WHERE line_id IS NOT NULL;
CREATE INDEX idx_users_status ON users(status);
```

**Validation Rules**:
- At least one of `email` or `line_id` must be provided
- `locale` must be ISO format (zh-TW, en)
- `display_name` defaults to email prefix or 'User' if LINE-only

### subscriptions

Manages user subscription tiers and payment state.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
  platform VARCHAR(20) NOT NULL, -- 'web' | 'ios' | 'android'
  external_id VARCHAR(255) NOT NULL, -- Stripe sub_xxx | Apple original_transaction_id | Google purchaseToken
  status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active' | 'canceled' | 'expired' | 'grace_period' | 'paused'
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  cancel_at TIMESTAMPTZ, -- User-initiated cancellation date
  canceled_at TIMESTAMPTZ, -- When cancellation took effect
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, platform) -- One active subscription per platform
);

CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_external_id ON subscriptions(external_id);
CREATE INDEX idx_subscriptions_end_at ON subscriptions(end_at) WHERE status IN ('active', 'grace_period');
```

**State Transitions**:
- `active`: Payment successful, features unlocked
- `grace_period`: Payment failed, 7-day retry window (Android)
- `canceled`: User canceled but subscription active until `end_at`
- `expired`: Past `end_at`, features locked
- `paused`: Temporary hold (e.g., payment dispute)

### plans

Defines subscription tiers and feature limits.

```sql
CREATE TABLE plans (
  id VARCHAR(50) PRIMARY KEY, -- 'free' | 'premium-monthly' | 'premium-yearly'
  name VARCHAR(100) NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  billing_period VARCHAR(20), -- NULL for free | 'monthly' | 'yearly'
  features JSONB NOT NULL DEFAULT '{}', -- Feature flags
  limits JSONB NOT NULL DEFAULT '{}', -- Quota limits
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO plans (id, name, price_usd, features, limits) VALUES
('free', 'Free Tier', 0,
 '{"spreads": ["1-card", "3-card"]}',
 '{"single_card_daily": 3, "three_card_daily": 1, "seven_card_daily": 0}'
),
('premium-monthly', 'Premium Monthly', 9.99,
 '{"spreads": ["1-card", "3-card", "7-card", "celtic-cross"], "themes": true, "priority": true, "multi_device": true}',
 '{"single_card_daily": -1, "three_card_daily": -1, "seven_card_daily": -1}' -- -1 = unlimited
),
('premium-yearly', 'Premium Yearly', 99.99,
 '{"spreads": ["1-card", "3-card", "7-card", "celtic-cross"], "themes": true, "priority": true, "multi_device": true}',
 '{"single_card_daily": -1, "three_card_daily": -1, "seven_card_daily": -1}'
);
```

**Limits Schema** (JSONB):
```json
{
  "single_card_daily": 3,  // -1 = unlimited
  "three_card_daily": 1,
  "seven_card_daily": 0
}
```

### sessions

Tracks conversation sessions with emotional context.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL DEFAULT 'web', -- 'web' | 'mobile' | 'line'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  sentiment JSONB, -- {score: -0.8 to 1.0, label: 'negative'|'neutral'|'positive'}
  topic_tags TEXT[] DEFAULT '{}', -- ['career', 'relationships', 'health']
  conversation_data JSONB DEFAULT '{}', -- Encrypted message history
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_ended_at ON sessions(ended_at) WHERE ended_at IS NULL; -- Active sessions
```

**Sentiment Schema** (JSONB):
```json
{
  "score": 0.6,
  "label": "positive",
  "confidence": 0.85,
  "crisis_level": "none"  // 'none' | 'moderate' | 'high' | 'immediate'
}
```

### tarot_draws

Records card draws and interpretations.

```sql
CREATE TABLE tarot_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spread_type VARCHAR(30) NOT NULL, -- '1-card' | '3-card' | '7-card' | 'celtic-cross'
  seed VARCHAR(100), -- Optional seed for reproducibility (premium feature)
  cards JSONB NOT NULL, -- Array of {card_id, position, orientation}
  interpretation JSONB NOT NULL, -- {tldr, key_points[], advice{}, warnings}
  generated_by VARCHAR(50), -- 'gpt-4o-mini' | 'claude-haiku' (model used)
  token_count INTEGER, -- Tokens consumed for interpretation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tarot_draws_user_created ON tarot_draws(user_id, created_at DESC);
CREATE INDEX idx_tarot_draws_session ON tarot_draws(session_id);
```

**Cards Schema** (JSONB):
```json
[
  {
    "card_id": 0,
    "name": "The Fool",
    "position": 0,
    "orientation": "upright"  // 'upright' | 'reversed'
  },
  {
    "card_id": 1,
    "name": "The Magician",
    "position": 1,
    "orientation": "reversed"
  }
]
```

**Interpretation Schema** (JSONB):
```json
{
  "tldr": "Brief summary in 1-2 sentences",
  "key_points": [
    "First insight about the situation",
    "Second insight",
    "Third insight"
  ],
  "advice": {
    "short_term": "Immediate action within 1-2 weeks",
    "medium_term": "Steps for next 1-3 months",
    "long_term": "Vision for 6+ months"
  },
  "warnings": "Gentle caution about potential pitfalls"
}
```

### memories (Semantic Memory Store)

Stores summarized reading context with vector embeddings for semantic search.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL, -- 'session' | 'topic' | 'life_area'
  summary TEXT NOT NULL,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  advice TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(1536), -- OpenAI ada-002 dimensionality
  metadata JSONB DEFAULT '{}', -- Additional context (life_area, date_range, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_user ON memories(user_id, created_at DESC);
CREATE INDEX ON memories USING hnsw (embedding vector_cosine_ops); -- Vector similarity index
CREATE INDEX idx_memories_scope ON memories(scope);
```

**Vector Search Query**:
```sql
-- Find top 3 similar memories
SELECT id, summary, key_points, advice,
       1 - (embedding <=> $2::vector) AS similarity
FROM memories
WHERE user_id = $1
ORDER BY embedding <=> $2::vector
LIMIT 3;
```

**Metadata Schema** (JSONB):
```json
{
  "life_area": "career",
  "date_range": "2025-10",
  "cards_involved": ["The Fool", "The Chariot"],
  "sentiment_trend": "improving"
}
```

### nudges (Proactive Outreach)

Tracks triggered outreach messages (email/LINE).

```sql
CREATE TABLE nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type VARCHAR(30) NOT NULL, -- 'inactivity_7d' | 'mood_decline' | 'weekly_summary' | 'monthly_reflection'
  template_id VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'email' | 'line'
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  error_message TEXT,
  metadata JSONB DEFAULT '{}', -- Personalization data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nudges_user_sent ON nudges(user_id, sent_at DESC);
CREATE INDEX idx_nudges_status ON nudges(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_nudges_trigger ON nudges(trigger_type, created_at DESC);
```

**Metadata Schema** (JSONB):
```json
{
  "last_reading_date": "2025-10-01",
  "days_inactive": 7,
  "mood_score_change": -0.3,
  "deep_link": "https://app.aitarotfriend.com/reading?session=abc123"
}
```

### events (Event Streaming)

Stores events for analytics and A/B testing (buffer before Kafka).

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'conversation.started' | 'reading.completed' | 'subscription.changed'
  payload JSONB NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_events_type_ts ON events(type, ts DESC);
CREATE INDEX idx_events_processed ON events(processed_at) WHERE processed_at IS NULL;
```

**Payload Examples**:

```json
// conversation.started
{
  "session_id": "uuid",
  "channel": "mobile",
  "initial_sentiment": 0.2
}

// reading.completed
{
  "session_id": "uuid",
  "spread_type": "3-card",
  "cards": ["The Fool", "The Magician", "The Tower"],
  "token_count": 450,
  "latency_ms": 1200
}

// subscription.changed
{
  "from_plan": "free",
  "to_plan": "premium-monthly",
  "platform": "ios",
  "attribution": "upgrade_prompt"
}
```

### audit_logs

Compliance audit trail for sensitive data access.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(20) NOT NULL, -- 'user' | 'admin' | 'system'
  actor_id UUID, -- users.id or admin_users.id
  action VARCHAR(50) NOT NULL, -- 'user.read' | 'subscription.update' | 'data.export'
  resource_type VARCHAR(50) NOT NULL, -- 'user' | 'subscription' | 'reading'
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, ts DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, ts DESC);
CREATE INDEX idx_audit_logs_ts ON audit_logs(ts DESC);
```

## Reference Data Tables

### cards (Static, 78 records)

```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY, -- 0-77
  name_en VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100) NOT NULL,
  suit VARCHAR(20), -- NULL for Major Arcana | 'wands' | 'cups' | 'swords' | 'pentacles'
  rank VARCHAR(20), -- NULL for Major Arcana | 'ace' | '2' | ... | 'king'
  arcana VARCHAR(10) NOT NULL, -- 'major' | 'minor'
  upright_meaning_en TEXT NOT NULL,
  upright_meaning_zh TEXT NOT NULL,
  reversed_meaning_en TEXT NOT NULL,
  reversed_meaning_zh TEXT NOT NULL,
  image_url VARCHAR(255),
  symbolism TEXT -- Rich description for prompt context
);

-- Seeded via scripts/seed-cards.ts
```

### spreads (Static, 3-5 records)

```sql
CREATE TABLE spreads (
  id VARCHAR(30) PRIMARY KEY, -- '1-card' | '3-card' | '7-card' | 'celtic-cross'
  name_en VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100) NOT NULL,
  card_count INTEGER NOT NULL,
  positions JSONB NOT NULL, -- Array of {index, name_en, name_zh, meaning}
  description_en TEXT,
  description_zh TEXT,
  premium_only BOOLEAN NOT NULL DEFAULT false
);

-- Seed data
INSERT INTO spreads (id, name_en, name_zh, card_count, positions, premium_only) VALUES
('1-card', 'Single Card', '單張牌', 1,
 '[{"index": 0, "name_en": "Guidance", "name_zh": "指引", "meaning": "Daily insight"}]',
 false
),
('3-card', 'Past-Present-Future', '過去-現在-未來', 3,
 '[
   {"index": 0, "name_en": "Past", "name_zh": "過去", "meaning": "Past influences"},
   {"index": 1, "name_en": "Present", "name_zh": "現在", "meaning": "Current situation"},
   {"index": 2, "name_en": "Future", "name_zh": "未來", "meaning": "Likely outcome"}
 ]',
 false
),
('7-card', 'Relationship', '關係牌陣', 7,
 '[... 7 position definitions ...]',
 true
);
```

## Admin Tables

### admin_users

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt
  role VARCHAR(20) NOT NULL, -- 'operator' | 'crm_analyst' | 'cms_editor' | 'super_admin'
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

## Data Retention & Privacy

**Retention Policy** (per constitution):
- User conversation history: 2 years from last session
- Reading records: 2 years
- Events: 90 days (then archived to S3)
- Audit logs: 7 years (compliance)

**Encryption**:
- `sessions.conversation_data`: Encrypted at application layer before storage
- PII fields (`email`, `line_id`): Encrypted at rest via PostgreSQL Transparent Data Encryption or disk encryption

**User Data Export** (GDPR):
```sql
-- Generate JSON export for user
SELECT json_build_object(
  'user', (SELECT row_to_json(u.*) FROM users u WHERE id = $1),
  'sessions', (SELECT json_agg(s.*) FROM sessions s WHERE user_id = $1),
  'readings', (SELECT json_agg(t.*) FROM tarot_draws t WHERE user_id = $1),
  'subscription', (SELECT row_to_json(sub.*) FROM subscriptions sub WHERE user_id = $1 AND status = 'active')
);
```

**User Data Deletion**:
```sql
-- Hard delete (GDPR "right to be forgotten")
BEGIN;
DELETE FROM memories WHERE user_id = $1;
DELETE FROM tarot_draws WHERE user_id = $1;
DELETE FROM sessions WHERE user_id = $1;
DELETE FROM nudges WHERE user_id = $1;
DELETE FROM subscriptions WHERE user_id = $1;
DELETE FROM users WHERE id = $1;
COMMIT;
```

## Migrations

Managed via TypeORM or Prisma migration tools:

```bash
# Generate migration
npm run migration:generate -- AddCrisisDetectionToSessions

# Run migrations
npm run migration:run

# Rollback
npm run migration:revert
```

## Performance Considerations

**Indexes**:
- All foreign keys indexed
- Composite indexes for common query patterns (`user_id + created_at DESC`)
- Vector HNSW index for similarity search (<100ms at 1M vectors)

**Partitioning** (Future, >1M rows):
- Partition `events` by month (easier archival)
- Partition `tarot_draws` by year (data retention cleanup)

**Query Optimization**:
- Use `SELECT DISTINCT ON` for latest record queries
- Precompute aggregations (daily reading counts) for dashboard

---

**Total Tables**: 14 (10 core + 2 reference + 2 admin)
**Est. Storage (10k users, 1 year)**: ~5GB (sessions + readings + memories)
**Backup Strategy**: Daily snapshots, 30-day retention, point-in-time recovery enabled
