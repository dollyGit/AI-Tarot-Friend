# Implementation Plan: AI Tarot Friend

**Branch**: `001-tarot-reading` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-tarot-reading/spec.md`

**Note**: This plan follows the `/speckit.plan` command workflow with Test-Driven Development (TDD) principles.

## Summary

AI Tarot Friend delivers an empathetic, memory-enabled tarot companion that listens to user concerns, provides contextual card interpretations, remembers past readings, and proactively reaches out for sustained engagement. The system prioritizes user psychological safety, token cost efficiency, and 99.9% availability through a multi-tier architecture: web/mobile clients (Next.js, React Native), API Gateway with custom orchestration layer, Tarot Engine with CSPRNG randomness, AI model router with vector retrieval (pgvector/Weaviate), PostgreSQL transactional data, Kafka event streaming, and comprehensive observability (OpenTelemetry + Grafana/Loki/Tempo).

## Technical Context

**Language/Version**:
- Backend: Node.js 20.x (TypeScript 5.3)
- Frontend Web: Next.js 14 (App Router), React 18
- Frontend Mobile: React Native 0.73 via Expo SDK 50
- Database: PostgreSQL 16

**Primary Dependencies**:
- API Gateway: Express.js with rate-limit middleware
- Orchestration: LangGraph (LangChain.js ecosystem)
- AI Integration: OpenAI SDK / Anthropic SDK (multi-provider)
- Vector Search: pgvector extension OR Weaviate managed service
- Event Streaming: Kafka (via KafkaJS) or AWS Kinesis
- Payments: Stripe SDK, Apple StoreKit, Google Play Billing
- Messaging: SendGrid (email), LINE Messaging API SDK
- Observability: @opentelemetry/api, @opentelemetry/sdk-node

**Storage**:
- Primary DB: PostgreSQL 16 (users, subscriptions, sessions, readings, audit_logs)
- Vector Store: pgvector (embeddings for semantic memory) OR Weaviate
- Object Storage: S3-compatible (AWS S3 or MinIO for exports/reports)
- Secrets: AWS Secrets Manager or HashiCorp Vault
- Cache: Redis 7.x (card meanings, interpretation fragments, session state)

**Testing**:
- Unit: Vitest (backend), Jest (frontend)
- Contract: Pact.js (API consumer-provider contracts)
- Integration: Supertest (API), Playwright (E2E web/mobile)
- Performance: Lighthouse CI (web), k6 (API load testing)
- Security: OWASP ZAP (DAST), npm audit

**Target Platform**:
- Backend: Linux server (containerized via Docker, deployed on AWS ECS/Fargate or equivalent)
- Web: Modern browsers (Chrome 90+, Safari 14+, Firefox 88+), PWA-capable
- Mobile: iOS 15+, Android 10+ (API level 29+)

**Project Type**: Web + Mobile (full-stack multi-client architecture)

**Performance Goals**:
- API P95 latency: < 800ms (per constitution SLO)
- Reading interpretation generation: < 5 seconds (95th percentile, per SC-005)
- Crisis detection: < 2 seconds (per SC-009)
- Multi-device sync: < 3 seconds (per SC-010)
- Throughput: Support 10,000 MAU with peak 500 concurrent users

**Constraints**:
- 99.9% uptime availability (per SC-006 and constitution SLO)
- Error rate: < 0.1% (per constitution SLO)
- Token budget adherence: < 105% of monthly allocation (per constitution SLO)
- Mobile app size: < 50MB download (App Store guidelines)
- Data encryption: TLS 1.3 in transit, AES-256 at rest (per constitution Security principle)

**Scale/Scope**:
- Users: 10,000 MAU target (MVP), scale to 100k within 12 months
- Data volume: ~1M readings/month at target scale, 2-year retention policy
- Geographic: Taiwan/Hong Kong primary markets (Traditional Chinese + English)
- Team: 2-3 engineers for MVP (6-month timeline)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User First (用戶至上)

| Requirement | Status | Implementation Plan |
|-------------|--------|---------------------|
| Empathetic, actionable guidance | ✅ PASS | FR-006 interpretation template: TL;DR, key points, short/medium/long-term advice. Prompt engineering avoids fatalistic language. |
| Avoid fatalistic language | ✅ PASS | Crisis detection (FR-009) + empathy-tuned prompts in Tarot Engine. Content guardrails filter fear-inducing phrasing. |
| Respect emotional state | ✅ PASS | Sentiment analysis (FR-002) stored in sessions table, adaptive response tone. |
| Mental health crisis referral | ✅ PASS | FR-009: Pattern detection triggers within 2s, provides resource URLs, adjusts tone. |

### II. Content Quality (內容品質)

| Requirement | Status | Implementation Plan |
|-------------|--------|---------------------|
| Rider-Waite 78-card deck | ✅ PASS | Static card data seeded in PostgreSQL (22 Major + 56 Minor), multilingual (zh-TW, en). |
| Upright & reversed positions | ✅ PASS | tarot_draws.orientation[] stores boolean array; interpretation logic branches on orientation. |
| Context integration | ✅ PASS | Orchestrator combines user input + card meanings + session history via semantic search (FR-008). |
| Standard spreads documented | ✅ PASS | spreads table defines 1-card, 3-card, 7-card with position meanings; contracts specify spread endpoints. |

### III. Security & Privacy (安全與隱私)

| Requirement | Status | Implementation Plan |
|-------------|--------|---------------------|
| Data minimization | ✅ PASS | Collect only: email/LINE ID, locale, conversations (encrypted), no biometrics. |
| Export & deletion rights | ✅ PASS | FR-018 admin backend + user-facing export API (JSON format), GDPR-compliant deletion. |
| Encryption (transit & rest) | ✅ PASS | TLS 1.3 (API Gateway), AES-256 (PostgreSQL transparent encryption or disk encryption). |
| Audit trails | ✅ PASS | audit_logs table records all reads/writes to users/subscriptions/readings with actor, timestamp. |
| Crisis detection & referral | ✅ PASS | FR-009 implemented as sentiment classifier + keyword matching, <2s latency. |

### IV. Token Cost Control (Token 成本控制)

| Requirement | Status | Implementation Plan |
|-------------|--------|---------------------|
| Small model priority | ✅ PASS | Model Router defaults to gpt-4o-mini (or Claude Haiku) for interpretation; reserves large models for crisis/complex cases. |
| Caching | ✅ PASS | Redis caches: (1) card meanings (78 cards × 2 orientations), (2) interpretation fragments (spread templates), (3) session context. TTL: 24h. |
| Vector retrieval before LLM | ✅ PASS | Semantic search (pgvector/Weaviate) fetches top-3 relevant past readings before prompt construction (RAG pattern). |
| Streaming generation | ✅ PASS | Long interpretations (>200 tokens) use SSE streaming to client, reducing perceived latency. |
| Rate limiting | ✅ PASS | API Gateway enforces per-user quotas (FR-010): free tier 3×1-card + 1×3-card/day; premium unlimited. |
| Quota monitoring | ✅ PASS | Kafka events → daily aggregation → alert if monthly tokens >105% budget. Dashboard shows token spend by user tier. |

### V. Observability (可觀測性)

| Requirement | Status | Implementation Plan |
|-------------|--------|---------------------|
| Logging (PII-redacted) | ✅ PASS | OpenTelemetry logs → Loki. Mask email/LINE ID in logs, retain user_id. Log all API requests, errors, LLM calls. |
| Metrics (latency, errors, tokens) | ✅ PASS | Prometheus metrics: api_request_duration_ms (P95), error_rate, token_usage_total, user_satisfaction_score. |
| Distributed tracing | ✅ PASS | OpenTelemetry traces span API Gateway → Orchestrator → Tarot Engine → LLM → DB. Trace IDs in all logs. |
| SLO-driven decisions | ✅ PASS | Grafana dashboards display SLOs: P95 < 800ms, uptime 99.9%, error rate < 0.1%, token budget < 105%. Alerts fire on violations. |
| Progressive rollout | ✅ PASS | Feature flags (LaunchDarkly or custom) + canary deployments (10% traffic → 50% → 100%). Rollback via deployment tags. |

**SLO Targets (per constitution)**:
- API response time (P95): < 800ms
- System availability: 99.9% uptime
- Error rate: < 0.1% of requests
- Token budget adherence: < 105% of monthly allocation
- Crisis detection latency: < 2s

### VI. Spec-Driven Development (開發方法)

| Requirement | Status | Implementation Plan |
|-------------|--------|---------------------|
| Specify → Plan → Tasks → Implement | ✅ PASS | Following workflow: spec.md (done) → plan.md (this file) → tasks.md (next) → TDD implementation. |
| Quality Gates | ✅ PASS | Gate 1 (Specify): ✅ No NEEDS CLARIFICATION. Gate 2 (Plan): This Constitution Check. Gates 3-4: TDD tests must pass. |
| TDD Red-Green-Refactor | ✅ PASS | See "TDD Workflow" section below. All tasks begin with failing tests. |

**Gate 2 Status**: ✅ **ALL PRINCIPLES PASS** - Proceed to Phase 0 research.

## TDD Workflow (Red-Green-Refactor)

Per user request: "記得要用TDD 告訴我紅燈綠燈重構的每個步驟"

All implementation tasks will follow this cycle:

### Red (紅燈): Write Failing Test First

1. **Contract Test**: Define expected API request/response (Pact)
2. **Integration Test**: Define expected user journey behavior (Supertest/Playwright)
3. **Unit Test**: Define expected function behavior (Vitest/Jest)
4. **Run Tests**: Verify ALL tests fail (red) before writing production code

**Example** (Card Drawing):
```typescript
// tests/contract/tarot-draws.contract.test.ts
test('POST /api/readings - draw 3-card spread', async () => {
  const response = await request(app)
    .post('/api/readings')
    .send({ user_id: 'test-user', spread_type: '3-card', seed: null })
    .expect(201);

  expect(response.body).toMatchObject({
    id: expect.any(String),
    spread_type: '3-card',
    cards: expect.arrayContaining([expect.objectContaining({
      card_id: expect.any(Number),
      position: expect.any(Number),
      orientation: expect.stringMatching(/upright|reversed/)
    })])
  });
});
```

Run: `npm test` → **FAILS** (endpoint doesn't exist) → Red ✅

### Green (綠燈): Write Minimum Code to Pass

1. **Implement Simplest Solution**: No optimization, just pass the test
2. **Run Tests Again**: Verify test turns green
3. **No Refactoring Yet**: Keep code ugly if needed to pass quickly

**Example**:
```typescript
// src/api/readings.ts
app.post('/api/readings', async (req, res) => {
  const { user_id, spread_type } = req.body;
  const cards = drawCards(spread_type); // simple CSPRNG implementation
  const reading = await db.tarot_draws.create({ user_id, spread_type, cards });
  res.status(201).json(reading);
});
```

Run: `npm test` → **PASSES** → Green ✅

### Refactor (重構): Improve Code Quality

1. **Extract Functions**: Break down complex logic
2. **Remove Duplication**: DRY principle
3. **Improve Names**: Clarity over cleverness
4. **Run Tests**: Ensure still green after every refactor
5. **Commit**: Save working state

**Example**:
```typescript
// src/services/tarot-engine.ts (refactored)
export class TarotEngine {
  drawCards(spread_type: SpreadType, seed?: string): DrawnCard[] {
    const spreadConfig = this.getSpreadConfig(spread_type);
    const rng = seed ? this.createSeededRNG(seed) : this.createCSPRNG();
    return this.selectCards(spreadConfig.card_count, rng);
  }

  private createCSPRNG(): RandomGenerator {
    return crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
  }
}
```

Run: `npm test` → **STILL PASSES** → Refactor ✅

**Repeat** for every feature: Red → Green → Refactor → Commit

## Project Structure

### Documentation (this feature)

```
specs/001-tarot-reading/
├── plan.md              # This file (implementation plan)
├── spec.md              # User requirements (already created)
├── research.md          # Technology research (Phase 0 below)
├── data-model.md        # Entity definitions (Phase 1 below)
├── quickstart.md        # Setup instructions (Phase 1 below)
├── contracts/           # API specifications (Phase 1 below)
│   ├── openapi.yaml     # REST API contract
│   └── events.yaml      # Kafka event schemas
├── checklists/          # Quality checklists
│   └── requirements.md  # Spec validation (already created)
└── tasks.md             # Implementation tasks (generated by /speckit.tasks)
```

### Source Code (repository root)

```
TarotReading/
├── backend/
│   ├── src/
│   │   ├── api/                    # Express routes (API Gateway)
│   │   │   ├── middleware/         # AuthN, AuthZ, rate-limiting
│   │   │   ├── readings.ts         # Card drawing endpoints
│   │   │   ├── sessions.ts         # Conversation endpoints
│   │   │   ├── users.ts            # User management
│   │   │   ├── subscriptions.ts    # Payment/quota endpoints
│   │   │   └── admin.ts            # Admin backend
│   │   ├── services/
│   │   │   ├── orchestrator.ts     # LangGraph conversation flow
│   │   │   ├── tarot-engine.ts     # CSPRNG card drawing + interpretation
│   │   │   ├── memory-service.ts   # Semantic vector search
│   │   │   ├── model-router.ts     # AI model selection (small-first)
│   │   │   ├── crisis-detector.ts  # Mental health pattern matching
│   │   │   ├── nudge-engine.ts     # Proactive outreach triggers
│   │   │   └── payment-service.ts  # Stripe/IAP integration
│   │   ├── models/                 # PostgreSQL entities (TypeORM or Prisma)
│   │   │   ├── user.ts
│   │   │   ├── subscription.ts
│   │   │   ├── session.ts
│   │   │   ├── tarot-draw.ts
│   │   │   ├── memory.ts
│   │   │   ├── nudge.ts
│   │   │   └── audit-log.ts
│   │   ├── lib/
│   │   │   ├── crypto.ts           # CSPRNG utilities
│   │   │   ├── prompts.ts          # LLM prompt templates
│   │   │   ├── cache.ts            # Redis client wrapper
│   │   │   └── observability.ts    # OpenTelemetry setup
│   │   └── workers/                # Background jobs
│   │       ├── event-processor.ts  # Kafka consumer (A/B events)
│   │       └── nudge-scheduler.ts  # Cron jobs (weekly/monthly outreach)
│   └── tests/
│       ├── contract/               # Pact consumer tests
│       ├── integration/            # Supertest API tests
│       └── unit/                   # Vitest service tests
│
├── frontend/                       # Next.js 14 (Web PWA)
│   ├── src/
│   │   ├── app/                    # App Router pages
│   │   │   ├── (auth)/             # Login/signup
│   │   │   ├── reading/            # Card drawing UI
│   │   │   ├── history/            # Past readings
│   │   │   ├── subscription/       # Payment/upgrade
│   │   │   └── admin/              # Admin dashboard
│   │   ├── components/             # React components
│   │   │   ├── tarot-card.tsx
│   │   │   ├── spread-layout.tsx
│   │   │   ├── chat-interface.tsx
│   │   │   └── theme-selector.tsx  # Premium theme packs
│   │   ├── services/               # API client (fetch wrappers)
│   │   │   └── api-client.ts
│   │   └── lib/
│   │       └── auth.ts             # NextAuth.js (if used)
│   └── tests/
│       └── e2e/                    # Playwright tests
│
├── mobile/                         # React Native (Expo)
│   ├── src/
│   │   ├── screens/                # Navigation screens
│   │   │   ├── ReadingScreen.tsx
│   │   │   ├── HistoryScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── components/             # Shared RN components
│   │   ├── services/               # API client (shared with web)
│   │   └── navigation/             # React Navigation setup
│   └── tests/
│       └── integration/            # Detox tests (optional)
│
├── shared/                         # Shared TypeScript types
│   ├── types/
│   │   ├── user.ts
│   │   ├── reading.ts
│   │   ├── api-contracts.ts        # Generated from OpenAPI
│   │   └── events.ts               # Kafka event types
│   └── constants/
│       ├── card-data.ts            # 78 Rider-Waite cards (static)
│       └── spreads.ts              # Spread configurations
│
├── infra/                          # Infrastructure as Code
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   └── docker-compose.yml      # Local dev environment
│   ├── terraform/                  # AWS ECS/RDS/S3 (or equivalent)
│   └── k8s/                        # Kubernetes manifests (if used)
│
├── scripts/
│   ├── seed-cards.ts               # Populate 78 cards in DB
│   ├── migrate.ts                  # Database migrations
│   └── generate-contracts.ts       # OpenAPI → TypeScript types
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Unit + contract tests
│       ├── security.yml            # OWASP ZAP, npm audit
│       └── deploy.yml              # Canary deployment to staging/prod
│
├── docs/
│   ├── architecture.md             # System design diagrams
│   ├── tdd-guide.md                # Red-Green-Refactor examples
│   └── crisis-protocol.md          # Mental health response procedures
│
├── package.json                    # Monorepo root (npm workspaces or Turborepo)
├── tsconfig.json                   # Shared TypeScript config
├── .env.example                    # Environment variable template
└── README.md                       # Project overview
```

**Structure Decision**: **Option 2 (Web + Mobile)** selected due to presence of Next.js web client + Expo mobile client. Backend serves both via shared REST API. Monorepo structure (npm workspaces or Turborepo) enables code sharing (types, constants, API client) while maintaining separation of concerns. Shared types ensure contract consistency across frontend/backend.

## Complexity Tracking

*No constitutional violations detected. All principles pass validation.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Phase 0: Outline & Research (Next Steps)

The following research areas will be documented in `research.md`:

1. **LangGraph vs Custom Orchestration**: Evaluate LangGraph for conversation state management vs lightweight custom state machine. Decision factors: learning curve, token overhead, debugging complexity.

2. **pgvector vs Weaviate**: Compare PostgreSQL pgvector extension (simpler ops, single DB) vs Weaviate managed service (richer query DSL, horizontal scaling). Decision based on scale target (10k→100k users).

3. **Kafka vs Kinesis**: AWS-native deployment favors Kinesis (managed, auto-scaling); multi-cloud favors Kafka (portable). Decision driven by infrastructure choice.

4. **Payment Integration Best Practices**: Research Stripe webhook security, IAP receipt validation (StoreKit 2, Google Play Billing Library 5), subscription state synchronization patterns.

5. **Crisis Detection Patterns**: Survey NLP approaches for mental health risk detection (keyword matching, sentiment thresholds, zero-shot classification). Balance sensitivity vs false positive rate.

6. **OpenTelemetry Setup**: Document instrumentation strategy for Node.js (auto vs manual), trace sampling rates (cost vs visibility), Grafana dashboard templates.

7. **TDD Workflow for LLM Integration**: Establish patterns for testing non-deterministic LLM outputs (snapshot testing with fixtures, mock LLM responses, prompt versioning).

**Output**: `research.md` will document decisions, rationales, and rejected alternatives for each area.

---

## Phase 1: Design & Contracts (Next Steps)

1. **data-model.md**: Define PostgreSQL schema for users, subscriptions, sessions, tarot_draws, memories, nudges, events, audit_logs. Include indexes, foreign keys, JSON column schemas.

2. **contracts/openapi.yaml**: REST API specification for all endpoints (readings, sessions, users, subscriptions, admin). Include authentication (JWT), request/response schemas, error codes.

3. **contracts/events.yaml**: Kafka event schemas (conversation.started, reading.completed, nudge.triggered, subscription.changed). Define partitioning keys, retention policies.

4. **quickstart.md**: Developer setup guide (prerequisites, `npm install`, DB migrations, seed data, `npm run dev`, test execution).

5. **Agent Context Update**: Run `.specify/scripts/bash/update-agent-context.sh claude` to add Node.js, TypeScript, Next.js, React Native, PostgreSQL, Kafka stack to `.claude/agent-context.md`.

**Output**: Complete technical design artifacts ready for `/speckit.tasks` command.
