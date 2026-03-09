# Technology Research: AI Tarot Friend

**Feature**: 001-tarot-reading
**Date**: 2025-10-08
**Purpose**: Document technology decisions, rationales, and alternatives for implementation planning

## 1. Orchestration: LangGraph vs Custom State Machine

### Decision: **Custom Lightweight State Machine** (with LangGraph evaluation for M1)

### Rationale

**Context**: Need to manage conversation flow (user input → sentiment detection → spread selection → card drawing → interpretation → memory storage).

**LangGraph Evaluation**:
- **Pros**: Rich ecosystem (LangChain.js), built-in memory management, visual debugging, agent coordination patterns
- **Cons**: Additional dependency weight (~5MB), learning curve for team, potential token overhead from framework abstractions, overkill for linear MVP flow

**Custom State Machine**:
- **Pros**: Full control over state transitions, minimal dependencies, explicit token cost visibility, easier testing (deterministic state), faster onboarding
- **Cons**: Manual implementation of retry logic, state persistence, need to build debugging tools

**Decision Factors**:
1. **Simplicity**: MVP conversation flow is linear (input → detection → selection → draw → interpret), not multi-agent branching
2. **Token Visibility**: Custom implementation makes every LLM call explicit, aiding cost optimization
3. **Team Size**: 2-3 engineers benefit from minimal abstractions during MVP
4. **Migration Path**: State machine interface can be swapped for LangGraph post-MVP if conversation complexity grows

### Implementation Approach

```typescript
// backend/src/services/orchestrator.ts
interface ConversationState {
  session_id: string;
  user_input: string;
  sentiment: SentimentScore;
  suggested_spread?: SpreadType;
  drawn_cards?: DrawnCard[];
  interpretation?: InterpretationResult;
  stage: 'input' | 'analysis' | 'drawing' | 'interpreting' | 'complete';
}

class ConversationOrchestrator {
  async processInput(session_id: string, user_input: string): Promise<ConversationState> {
    const state = await this.loadState(session_id);
    state.user_input = user_input;
    state.stage = 'analysis';

    // Linear pipeline
    state.sentiment = await this.sentimentDetector.analyze(user_input);
    state.suggested_spread = this.selectSpread(state.sentiment);
    state.drawn_cards = await this.tarotEngine.drawCards(state.suggested_spread);
    state.interpretation = await this.interpretationGenerator.generate(
      state.drawn_cards,
      state.user_input,
      await this.memoryService.recall(session_id)
    );

    state.stage = 'complete';
    await this.saveState(state);
    return state;
  }
}
```

### Alternatives Considered

- **Temporal.io**: Overkill for simple workflow, introduces distributed system complexity
- **AWS Step Functions**: Vendor lock-in, latency overhead (100-200ms per state transition), cost at scale
- **State Machine Library (XState)**: Good middle ground, but adds 100KB bundle size for functionality we can implement in 500 lines

**Post-MVP Re-evaluation Trigger**: If conversation requires multi-turn negotiation (e.g., "Would you like more detail on The Tower?") or branching logic (crisis intervention vs normal reading), revisit LangGraph.

---

## 2. Vector Search: pgvector vs Weaviate

### Decision: **pgvector** (with Weaviate migration path documented)

### Rationale

**Context**: Need semantic search for user memory retrieval (FR-008): "Find similar past readings to provide context."

**pgvector Evaluation**:
- **Pros**: Single database (PostgreSQL), simpler ops (no additional service), ACID transactions (memory + reading updates atomic), L2/cosine distance built-in, <100ms query latency at 10k user scale
- **Cons**: Limited to ~1M vectors per table before performance degrades, no advanced query DSL (hybrid search, filters), manual indexing tuning (HNSW parameters)

**Weaviate Evaluation**:
- **Pros**: Purpose-built vector DB, horizontal scaling, hybrid search (vector + keyword), GraphQL query interface, built-in reranking
- **Cons**: Additional service to manage, eventual consistency (separate from PostgreSQL), cost (~$100/mo managed service), learning curve

**Decision Factors**:
1. **Operational Simplicity**: pgvector leverages existing PostgreSQL expertise, no new service to monitor
2. **Scale Target**: MVP targets 10k MAU → ~100k readings → <1M vectors (within pgvector sweet spot)
3. **Transactional Consistency**: Memory creation + embedding storage in same transaction prevents race conditions
4. **Cost**: No additional managed service fees during MVP phase

### Implementation Approach

```sql
-- PostgreSQL schema
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  scope TEXT NOT NULL, -- 'session' | 'topic' | 'life_area'
  summary TEXT NOT NULL,
  key_points TEXT[] NOT NULL,
  advice TEXT[] NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimensionality
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON memories USING hnsw (embedding vector_cosine_ops);
```

```typescript
// Semantic search query
const similarMemories = await db.query(`
  SELECT id, summary, key_points,
         1 - (embedding <=> $2) AS similarity
  FROM memories
  WHERE user_id = $1
  ORDER BY embedding <=> $2
  LIMIT 3
`, [user_id, query_embedding]);
```

### Migration Path to Weaviate

**Trigger Conditions** (when to migrate):
- Vector count exceeds 500k (query latency >200ms)
- Need hybrid search (e.g., "show me career readings from last month with positive sentiment")
- Multi-tenancy requires data isolation per user (Weaviate tenants feature)

**Migration Steps**:
1. Export embeddings from PostgreSQL (batch script)
2. Bulk import to Weaviate (weaviate-client SDK)
3. Update `memory-service.ts` to query Weaviate API instead of PostgreSQL
4. Keep PostgreSQL as source of truth for summary/key_points (Weaviate stores only embeddings + IDs)

### Alternatives Considered

- **Pinecone**: Managed vector DB, excellent performance, but $70/mo minimum + vendor lock-in
- **Milvus**: Open-source, similar to Weaviate, but heavier operational burden (Kubernetes required)
- **Qdrant**: Rust-based, fast, but smaller ecosystem than Weaviate (fewer integrations, community support)

---

## 3. Event Streaming: Kafka vs AWS Kinesis

### Decision: **AWS Kinesis** (infrastructure assumed AWS-based per user stack preferences)

### Rationale

**Context**: Need event streaming for (1) conversation events → analytics, (2) trigger conditions → nudge engine, (3) A/B test events.

**Kafka Evaluation**:
- **Pros**: Industry standard, portable (runs anywhere), rich ecosystem (Kafka Connect, Confluent Cloud), exactly-once semantics, topic compaction for state
- **Cons**: Operational complexity (Zookeeper/KRaft, broker management), higher baseline cost ($200/mo managed), overkill for <1000 events/sec

**AWS Kinesis Evaluation**:
- **Pros**: Fully managed (no ops), auto-scaling, integrates with AWS Lambda (serverless consumers), pay-per-shard (~$15/mo for MVP), at-least-once delivery sufficient
- **Cons**: AWS vendor lock-in, 1MB/sec write limit per shard (need multiple shards at scale), 24h-7day retention (vs Kafka unlimited), no topic compaction

**Decision Factors**:
1. **Infrastructure Alignment**: User mentioned ECS/Fargate → AWS-native stack favors Kinesis
2. **MVP Scale**: <500 events/sec (10k users × 5 events/day / 86400s) = 1 shard sufficient
3. **Operational Simplicity**: Zero-ops model critical for 2-3 person team
4. **Cost**: $15/mo (1 shard) vs $200/mo (Kafka managed) at MVP scale

### Implementation Approach

```typescript
// backend/src/workers/event-producer.ts
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';

class EventProducer {
  async publish(event: ConversationEvent) {
    await this.kinesis.send(new PutRecordCommand({
      StreamName: 'tarot-events',
      PartitionKey: event.user_id, // Ensures user event ordering
      Data: Buffer.from(JSON.stringify(event))
    }));
  }
}

// backend/src/workers/nudge-scheduler.ts (Lambda consumer)
export const handler = async (event: KinesisStreamEvent) => {
  for (const record of event.Records) {
    const payload = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString());

    if (payload.type === 'reading.completed') {
      await checkMoodTrend(payload.user_id); // Trigger condition check
    }
  }
};
```

### Migration Path to Kafka

**Trigger Conditions**:
- Multi-cloud deployment required (Kinesis is AWS-only)
- Event rate exceeds 5000/sec (need Kafka parallelism)
- Require exactly-once semantics (payment events, subscription state)
- Need long-term event replay (>7 days retention)

**Migration Steps**:
1. Deploy Confluent Cloud or MSK (managed Kafka on AWS)
2. Implement dual-write pattern (Kinesis + Kafka) during transition
3. Update consumers to read from Kafka
4. Deprecate Kinesis streams after validation

### Alternatives Considered

- **AWS EventBridge**: Good for simple pub/sub, but limited throughput (10k events/sec max), higher latency (100-500ms), no ordering guarantees
- **RabbitMQ**: Not designed for streaming (message deletion after consume), complex clustering for HA
- **Redis Streams**: Excellent for low-latency (<10ms), but no managed service, manual HA setup

---

## 4. Payment Integration Best Practices

### Decision: **Stripe (Web) + StoreKit 2 (iOS) + Google Play Billing Library 5 (Android)**

### Rationale

**Context**: FR-012/FR-013 require in-app purchase (mobile) and credit card (web) subscription processing.

### Stripe (Web Subscriptions)

**Implementation Pattern**:
```typescript
// backend/src/services/payment-service.ts
import Stripe from 'stripe';

class PaymentService {
  async createSubscription(user_id: string, plan_id: string) {
    // 1. Create Stripe Customer (idempotent)
    const customer = await this.stripe.customers.create({
      metadata: { user_id },
      email: user.email
    });

    // 2. Create Subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: plan_id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    // 3. Return client_secret for frontend payment confirmation
    return {
      subscription_id: subscription.id,
      client_secret: subscription.latest_invoice.payment_intent.client_secret
    };
  }

  // Webhook handler (endpoint: /api/webhooks/stripe)
  async handleWebhook(payload: Buffer, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscription(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.cancelSubscription(event.data.object.id);
        break;
    }
  }
}
```

**Security Best Practices**:
- Webhook signature verification (prevents replay attacks)
- Idempotent event processing (deduplicate via `event.id`)
- Atomic DB updates (subscription status + audit log in transaction)

### StoreKit 2 (iOS)

**Implementation Pattern**:
```typescript
// mobile/src/services/iap-service.ts (React Native)
import { requestPurchase, useIAP, finishTransaction } from 'react-native-iap';

// Backend verification
class IAPService {
  async verifyIOSReceipt(receipt: string) {
    const verifyUrl = process.env.NODE_ENV === 'production'
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';

    const response = await fetch(verifyUrl, {
      method: 'POST',
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': process.env.APPLE_SHARED_SECRET
      })
    });

    const data = await response.json();
    if (data.status === 0) {
      await this.activateSubscription(data.latest_receipt_info[0]);
    }
  }
}
```

**Best Practices**:
- Server-side receipt validation (prevent client spoofing)
- Handle subscription status changes via App Store Server Notifications (webhook)
- Store `original_transaction_id` for refund/cancellation tracking

### Google Play Billing Library 5 (Android)

**Implementation Pattern**:
```typescript
// Backend verification via Google Play Developer API
import { google } from 'googleapis';

class IAPService {
  async verifyAndroidPurchase(purchaseToken: string, subscriptionId: string) {
    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: this.googleAuthClient
    });

    const result = await androidPublisher.purchases.subscriptions.get({
      packageName: 'com.aitarotfriend',
      subscriptionId,
      token: purchaseToken
    });

    if (result.data.paymentState === 1) { // Payment received
      await this.activateSubscription(result.data);
    }
  }
}
```

**Best Practices**:
- Real-time developer notifications (RTDN) for subscription events
- Grace period handling (failed payment retry for 7 days)
- Proration mode for mid-cycle upgrades/downgrades

### Subscription State Synchronization

**Challenge**: User can subscribe on web, then use mobile (expect premium features) → need cross-platform state sync.

**Solution**: Centralize subscription state in PostgreSQL `subscriptions` table:

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id TEXT NOT NULL, -- 'free' | 'premium-monthly' | 'premium-yearly'
  platform TEXT NOT NULL, -- 'web' | 'ios' | 'android'
  external_id TEXT NOT NULL, -- Stripe subscription_id or Apple original_transaction_id
  status TEXT NOT NULL, -- 'active' | 'canceled' | 'expired' | 'grace_period'
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON subscriptions(user_id) WHERE status = 'active';
```

**Sync Flow**:
1. User subscribes on any platform → webhook triggers
2. Backend updates `subscriptions` table (upsert)
3. Client polls `/api/users/me/subscription` on app open
4. Backend checks `subscriptions.status` + `end_at` → return current tier
5. Frontend shows/hides features based on tier

---

## 5. Crisis Detection Patterns

### Decision: **Hybrid Approach** (Keyword Matching + Sentiment Threshold + Zero-Shot Classification)

### Rationale

**Context**: FR-009 requires mental health crisis detection (<2s latency) for self-harm/suicidal expressions.

### Three-Tier Detection Strategy

#### Tier 1: Keyword Matching (< 10ms)

**Fast filtering** for obvious crisis terms:

```typescript
const CRISIS_KEYWORDS = {
  selfHarm: ['自殺', 'suicide', '自殘', 'self-harm', '結束生命', 'end my life'],
  severeDepression: ['活不下去', "can't go on", '沒有意義', 'meaningless', '想死', 'want to die'],
  immediateRisk: ['今晚', 'tonight', '現在', 'right now', '立刻', 'immediately']
};

function quickScan(text: string): CrisisLevel {
  const lowerText = text.toLowerCase();

  if (CRISIS_KEYWORDS.immediateRisk.some(kw => lowerText.includes(kw))) {
    return 'IMMEDIATE'; // Trigger emergency protocol
  }
  if (CRISIS_KEYWORDS.selfHarm.some(kw => lowerText.includes(kw))) {
    return 'HIGH';
  }
  if (CRISIS_KEYWORDS.severeDepression.some(kw => lowerText.includes(kw))) {
    return 'MODERATE';
  }
  return 'NONE';
}
```

#### Tier 2: Sentiment Analysis (50-100ms)

**Sentiment scorer** (using small model like DistilBERT or OpenAI moderation API):

```typescript
async function analyzeSentiment(text: string): Promise<SentimentScore> {
  // Option 1: OpenAI Moderation API (10ms, $0.002/1k requests)
  const moderation = await openai.moderations.create({ input: text });
  if (moderation.results[0].categories['self-harm']) {
    return { level: 'CRISIS', confidence: moderation.results[0].category_scores['self-harm'] };
  }

  // Option 2: Local DistilBERT model (100ms, no API cost)
  const sentiment = await sentimentClassifier.predict(text);
  return sentiment.score < -0.8 ? { level: 'SEVERE_NEGATIVE', confidence: sentiment.confidence } : { level: 'NORMAL' };
}
```

#### Tier 3: Zero-Shot Classification (500ms-1s)

**Contextual understanding** for ambiguous cases:

```typescript
async function classifyCrisis(text: string): Promise<CrisisClassification> {
  const prompt = `Classify the following user message into one of these categories:
1. IMMEDIATE_RISK: Expresses intent to harm self now/soon
2. SUICIDAL_IDEATION: Mentions suicidal thoughts without immediate plan
3. SEVERE_DISTRESS: Extreme emotional pain but no self-harm mention
4. NORMAL: No crisis indicators

User message: "${text}"

Classification:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Small, fast model
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 10,
    temperature: 0
  });

  return parseClassification(response.choices[0].message.content);
}
```

### Combined Pipeline (<2s total)

```typescript
class CrisisDetector {
  async detect(text: string): Promise<CrisisResponse> {
    // Tier 1: Immediate (10ms)
    const keywordLevel = quickScan(text);
    if (keywordLevel === 'IMMEDIATE') {
      return { level: 'IMMEDIATE', resources: CRISIS_RESOURCES, skipReading: true };
    }

    // Tier 2: Fast sentiment (100ms) - runs in parallel with Tier 3 if Tier 1 = HIGH
    const [sentiment, classification] = await Promise.all([
      keywordLevel === 'HIGH' ? analyzeSentiment(text) : Promise.resolve({ level: 'NORMAL' }),
      keywordLevel === 'HIGH' ? classifyCrisis(text) : Promise.resolve({ category: 'NORMAL' })
    ]);

    // Combine signals
    if (classification.category === 'IMMEDIATE_RISK' || sentiment.level === 'CRISIS') {
      return {
        level: 'HIGH',
        resources: CRISIS_RESOURCES,
        adjustTone: 'compassionate-urgent',
        notifySupport: true
      };
    }

    return { level: 'NONE' };
  }
}
```

### Crisis Resources

```typescript
const CRISIS_RESOURCES = {
  'zh-TW': {
    hotline: '安心專線 1925 (24小時免費)',
    url: 'https://www.mohw.gov.tw/cp-88-252-1.html',
    message: '我注意到您可能正在經歷困難時刻。請記得,專業的心理健康支持隨時可用。'
  },
  'en': {
    hotline: 'National Suicide Prevention Lifeline: 988',
    url: 'https://988lifeline.org',
    message: 'I notice you may be going through a difficult time. Professional mental health support is available.'
  }
};
```

### False Positive Mitigation

- **Context Window**: Check last 3 messages (user might be quoting someone else: "My friend said 'I want to die'")
- **Severity Threshold**: Require confidence > 0.7 for HIGH alert
- **Human Review**: Log all detections for periodic review (tune keywords)

### Latency Budget

| Stage | Latency | Cumulative |
|-------|---------|------------|
| Tier 1 (Keywords) | 10ms | 10ms |
| Tier 2 (Sentiment) | 100ms | 110ms |
| Tier 3 (Zero-Shot) | 1000ms | 1110ms |
| Resource Lookup | 50ms | 1160ms |
| Response Generation | 500ms | 1660ms |

**Total: ~1.7s** (within 2s SLO per SC-009)

---

## 6. OpenTelemetry Setup

### Decision: **Auto-Instrumentation + Manual Spans for Business Logic**

### Rationale

**Context**: Constitution Principle V requires comprehensive observability (logs, metrics, traces).

### Architecture

```
Application
    ↓
OpenTelemetry SDK (auto-instrument HTTP/DB)
    ↓
OpenTelemetry Collector (aggregate + batch)
    ↓
    ├─→ Loki (logs)
    ├─→ Prometheus (metrics)
    └─→ Tempo (traces)
         ↓
    Grafana (unified dashboard)
```

### Backend Implementation

```typescript
// backend/src/lib/observability.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export function initObservability() {
  const sdk = new NodeSDK({
    serviceName: 'tarot-api',
    traceExporter: new OTLPTraceExporter({
      url: 'http://otel-collector:4318/v1/traces'
    }),
    metricReader: new PrometheusExporter({
      port: 9464,
      endpoint: '/metrics'
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true } // PostgreSQL
      })
    ]
  });

  sdk.start();
  console.log('OpenTelemetry initialized');
}
```

### Manual Spans for Business Logic

```typescript
// backend/src/services/tarot-engine.ts
import { trace, context } from '@opentelemetry/api';

const tracer = trace.getTracer('tarot-engine');

class TarotEngine {
  async generateInterpretation(cards: DrawnCard[], userInput: string) {
    return await tracer.startActiveSpan('generate_interpretation', async (span) => {
      span.setAttribute('spread_type', cards.length);
      span.setAttribute('user_input_length', userInput.length);

      try {
        // Nested span for LLM call
        const interpretation = await tracer.startActiveSpan('llm_call', async (llmSpan) => {
          llmSpan.setAttribute('model', 'gpt-4o-mini');

          const start = Date.now();
          const result = await this.modelRouter.complete(prompt);

          llmSpan.setAttribute('tokens_used', result.usage.total_tokens);
          llmSpan.setAttribute('latency_ms', Date.now() - start);
          llmSpan.end();

          return result;
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return interpretation;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

### Metrics to Track

```typescript
// backend/src/lib/metrics.ts
import { MeterProvider } from '@opentelemetry/sdk-metrics';

const meter = metrics.getMeter('tarot-api');

export const requestDuration = meter.createHistogram('api_request_duration_ms', {
  description: 'API request latency in milliseconds',
  unit: 'ms'
});

export const tokenUsage = meter.createCounter('llm_token_usage_total', {
  description: 'Total tokens consumed by LLM calls',
  unit: 'tokens'
});

export const crisisDetections = meter.createCounter('crisis_detections_total', {
  description: 'Number of mental health crisis detections',
  unit: 'detections'
});

// Usage
requestDuration.record(responseTime, { endpoint: '/api/readings', status: 201 });
tokenUsage.add(usage.total_tokens, { model: 'gpt-4o-mini', user_tier: 'free' });
```

### Grafana Dashboards

**SLO Dashboard** (constitution compliance):
- P95 API latency (target < 800ms)
- Error rate (target < 0.1%)
- Token budget burn rate (target < 105%/month)
- Uptime percentage (target 99.9%)

**Business Metrics Dashboard**:
- Readings per day (by spread type)
- Free → Premium conversion rate
- Crisis detections (by severity)
- Outreach CTR (email vs LINE)

### Trace Sampling

**Strategy**: Always sample errors, sample 10% of successful requests

```typescript
import { ParentBasedSampler, AlwaysOnSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1) // 10% sampling
});

// In error handler middleware
if (error) {
  span.setAttribute('force.sampling', true); // Always sample errors
}
```

### Log Structure (PII Redaction)

```typescript
// backend/src/lib/logger.ts
import pino from 'pino';

const logger = pino({
  redact: {
    paths: ['email', 'line_id', 'user_input'], // Redact PII
    censor: '[REDACTED]'
  },
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => {
      const traceId = context.active().getValue('trace_id');
      return { ...object, trace_id: traceId }; // Link logs to traces
    }
  }
});

logger.info({ user_id: '123', action: 'reading.created', cards: ['The Fool', 'The Magician'] });
// Output: {"level":"info","user_id":"123","action":"reading.created","cards":["The Fool","The Magician"],"trace_id":"abc123"}
```

---

## 7. TDD Workflow for LLM Integration

### Decision: **Snapshot Testing + Mock Responses + Prompt Versioning**

### Rationale

**Challenge**: LLM outputs are non-deterministic → traditional equality assertions fail.

### Three-Tier Testing Strategy

#### Tier 1: Unit Tests (Deterministic Logic)

Test **around** the LLM, not the LLM itself:

```typescript
// tests/unit/tarot-engine.test.ts
describe('TarotEngine', () => {
  it('should select correct number of cards for spread type', () => {
    const engine = new TarotEngine();
    const cards = engine.drawCards('3-card', 'test-seed-123');

    expect(cards).toHaveLength(3);
    expect(cards[0].position).toBe(0); // Past
    expect(cards[1].position).toBe(1); // Present
    expect(cards[2].position).toBe(2); // Future
  });

  it('should use CSPRNG when no seed provided', () => {
    const engine = new TarotEngine();
    const draw1 = engine.drawCards('1-card');
    const draw2 = engine.drawCards('1-card');

    expect(draw1[0].card_id).not.toBe(draw2[0].card_id); // Different cards
  });

  it('should reproduce same cards with seed', () => {
    const engine = new TarotEngine();
    const draw1 = engine.drawCards('3-card', 'seed-456');
    const draw2 = engine.drawCards('3-card', 'seed-456');

    expect(draw1).toEqual(draw2); // Deterministic
  });
});
```

#### Tier 2: Contract Tests (Mock LLM Responses)

Test **contract** with LLM provider:

```typescript
// tests/contract/model-router.contract.test.ts
import { mockOpenAI } from '../mocks/openai';

describe('ModelRouter', () => {
  it('should send correct prompt structure to LLM', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Mock interpretation' } }],
      usage: { total_tokens: 150 }
    };

    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

    const router = new ModelRouter();
    await router.complete('Test prompt');

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: 'Test prompt' })
      ]),
      temperature: 0.7,
      max_tokens: 500
    });
  });

  it('should handle LLM rate limit error', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue(
      new Error('Rate limit exceeded')
    );

    const router = new ModelRouter();

    await expect(router.complete('Test')).rejects.toThrow('Rate limit');
    // Verify exponential backoff retry logic
  });
});
```

#### Tier 3: Integration Tests (Snapshot + Structural Validation)

Test **output structure**, not exact wording:

```typescript
// tests/integration/interpretation.integration.test.ts
describe('Interpretation Generation', () => {
  it('should generate valid interpretation structure', async () => {
    const cards = [
      { card_id: 0, name: 'The Fool', orientation: 'upright' },
      { card_id: 1, name: 'The Magician', orientation: 'reversed' }
    ];

    const interpretation = await tarotEngine.generateInterpretation(
      cards,
      'I am worried about my career'
    );

    // Structural validation (not exact text)
    expect(interpretation).toMatchObject({
      tldr: expect.stringMatching(/.{20,200}/), // 20-200 chars
      key_points: expect.arrayContaining([
        expect.stringMatching(/.+/), // Non-empty strings
        expect.stringMatching(/.+/),
        expect.stringMatching(/.+/)
      ]),
      advice: expect.objectContaining({
        short_term: expect.stringMatching(/.+/),
        medium_term: expect.stringMatching(/.+/),
        long_term: expect.stringMatching(/.+/)
      }),
      warnings: expect.any(String)
    });

    // Snapshot test (for regression detection)
    expect(interpretation).toMatchSnapshot({
      tldr: expect.any(String), // Ignore dynamic content
      key_points: expect.any(Array),
      advice: expect.any(Object)
    });
  });

  it('should not use fatalistic language', async () => {
    const interpretation = await tarotEngine.generateInterpretation(
      mockCards,
      'My relationship is struggling'
    );

    const fatalisticPhrases = [
      'doomed', 'cursed', 'inevitable failure', 'no hope', '註定失敗'
    ];

    const fullText = JSON.stringify(interpretation).toLowerCase();
    fatalisticPhrases.forEach(phrase => {
      expect(fullText).not.toContain(phrase);
    });
  });
});
```

### Prompt Versioning

**Problem**: Prompt changes break tests.

**Solution**: Version prompts like database schemas:

```typescript
// backend/src/lib/prompts.ts
export const PROMPTS = {
  interpretation_v1: `You are an empathetic tarot reader. Generate an interpretation...`,
  interpretation_v2: `[Updated prompt with better structure]`
};

// In code
const prompt = PROMPTS.interpretation_v2; // Use latest

// In tests
const prompt = PROMPTS.interpretation_v1; // Pin to specific version
```

### TDD Red-Green-Refactor Cycle with LLM

**Red**: Write test expecting interpretation structure
```typescript
test('interpretation has tldr', async () => {
  const result = await generateInterpretation(cards, input);
  expect(result.tldr).toBeDefined();
});
```
Run: ❌ FAILS (function doesn't exist)

**Green**: Hardcode simplest passing implementation
```typescript
async function generateInterpretation(cards, input) {
  return { tldr: 'Hardcoded summary' };
}
```
Run: ✅ PASSES

**Refactor**: Replace hardcoded value with real LLM call
```typescript
async function generateInterpretation(cards, input) {
  const prompt = buildPrompt(cards, input);
  const response = await llm.complete(prompt);
  return parseResponse(response);
}
```
Run: ✅ STILL PASSES (structure validated, not exact text)

---

## Summary of Decisions

| Area | Decision | Key Rationale |
|------|----------|---------------|
| Orchestration | Custom State Machine | Simplicity for linear MVP flow, explicit token visibility |
| Vector Search | pgvector | Operational simplicity, single DB, sufficient for 10k-100k users |
| Event Streaming | AWS Kinesis | Managed service, AWS-native stack, cost-effective at MVP scale |
| Payments | Stripe + StoreKit 2 + Play Billing 5 | Industry standard, comprehensive documentation, webhook-driven sync |
| Crisis Detection | Keyword + Sentiment + Zero-Shot | <2s latency via tiered approach, balance sensitivity/specificity |
| Observability | OpenTelemetry auto + manual | Vendor-neutral, comprehensive (logs/metrics/traces), Grafana integration |
| TDD for LLM | Snapshot + Mock + Versioning | Non-deterministic output handled via structure validation, prompt versioning prevents test brittleness |

**Post-MVP Re-evaluation Triggers** documented for each decision → enables data-driven migration path.
