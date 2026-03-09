# Tasks: AI Tarot Friend

**Input**: Design documents from `/specs/001-tarot-reading/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**TDD Approach**: This feature follows Test-Driven Development (Red-Green-Refactor). All implementation tasks begin with failing tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `backend/src/` (API, services, models, workers)
- **Frontend Web**: `frontend/src/` (Next.js App Router)
- **Mobile**: `mobile/src/` (React Native/Expo)
- **Shared**: `shared/` (TypeScript types, constants)
- **Tests**: `backend/tests/`, `frontend/tests/`, `mobile/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and monorepo structure. These tasks create the foundation but don't implement user-facing features.

- [x] **T001** [P] [Setup] Initialize monorepo with pnpm workspaces - create `package.json` at repo root with workspaces: `backend`, `frontend`, `mobile`, `shared`
- [x] **T002** [P] [Setup] Create backend package structure - initialize `backend/package.json` with TypeScript 5.3, Express.js, Vitest dependencies
- [x] **T003** [P] [Setup] Create frontend package structure - initialize `frontend/package.json` with Next.js 14, React 18, Jest dependencies
- [x] **T004** [P] [Setup] Create mobile package structure - initialize `mobile/package.json` with Expo SDK 50, React Native 0.73 dependencies
- [x] **T005** [P] [Setup] Create shared package structure - initialize `shared/package.json` with shared TypeScript types and constants
- [x] **T005.5** [P] [Setup] Create shared API client base - create `shared/services/api-client-base.ts` with shared fetch logic, retry mechanism, error handling, and typed request/response wrappers for reuse in web and mobile applications
- [x] **T006** [Setup] Configure root TypeScript - create `tsconfig.json` at repo root with strict mode, path aliases for `@backend`, `@frontend`, `@mobile`, `@shared`
- [x] **T007** [P] [Setup] Setup ESLint and Prettier - create `.eslintrc.js` and `.prettierrc` with team coding standards
- [x] **T008** [P] [Setup] Create Docker Compose dev environment - define `docker-compose.yml` with PostgreSQL 16, Redis 7, localstack services
- [x] **T009** [P] [Setup] Setup GitHub Actions CI workflow - create `.github/workflows/ci.yml` for unit tests, linting, type checking
- [x] **T010** [Setup] Create environment configuration - create `.env.example` with all required variables (database, AI APIs, payment keys)
- [x] **T011** [P] [Setup] Document README - create `README.md` with project overview, setup instructions, link to constitution
- [x] **T012** [P] [Setup] Setup Vitest config - create `backend/vitest.config.ts` with coverage reporting, test fixtures path
- [x] **T013** [P] [Setup] Setup Jest config - create `frontend/jest.config.js` and `mobile/jest.config.js` for React testing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database & ORM

- [x] **T014** [Foundation] Setup PostgreSQL connection - create `backend/src/lib/database.ts` with connection pool, error handling
- [x] **T015** [Foundation] Initialize Prisma ORM - create `backend/prisma/schema.prisma` with initial datasource configuration
- [x] **T016** [Foundation] Create database migration system - setup `backend/src/scripts/migrate.ts` with up/down migration support

### Authentication & Authorization

- [x] **T017** [Foundation] Setup JWT authentication - create `backend/src/lib/auth.ts` with token generation, verification, refresh logic
- [x] **T018** [Foundation] Create auth middleware - create `backend/src/api/middleware/auth.ts` to extract and validate JWT from requests
- [x] **T019** [Foundation] Implement rate limiting - create `backend/src/api/middleware/rate-limit.ts` using express-rate-limit with Redis backend

### Core Services

- [x] **T020** [P] [Foundation] Setup Redis client - create `backend/src/lib/cache.ts` with connection, get/set wrappers, error recovery
- [x] **T021** [P] [Foundation] Setup OpenTelemetry - create `backend/src/lib/observability.ts` with auto-instrumentation for HTTP, DB, Redis
- [x] **T022** [P] [Foundation] Create logging utility - create `backend/src/lib/logger.ts` using Pino with PII redaction, trace ID injection
- [x] **T023** [Foundation] Setup error handling middleware - create `backend/src/api/middleware/error-handler.ts` with standardized error responses

### Static Data Seeding

- [x] **T024** [Foundation] Seed 78 Rider-Waite cards - create `backend/src/scripts/seed-cards.ts` to populate `cards` table with multilingual names, meanings
- [x] **T025** [Foundation] Seed spread configurations - create `backend/src/scripts/seed-spreads.ts` to populate `spreads` table (1-card, 3-card, 7-card)
- [x] **T026** [Foundation] Seed subscription plans - create `backend/src/scripts/seed-plans.ts` to populate `plans` table (free, premium-monthly, premium-yearly)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initial Tarot Reading Session (Priority: P1) 🎯 MVP

**Goal**: Users can share concerns, receive spread recommendations, draw cards, and get empathetic interpretations with crisis detection.

**Independent Test**: Open app → type "I'm worried about my career" → receive 3-card spread suggestion → draw cards → see TL;DR + key points + advice.

### TDD: Write Failing Tests First (Red 🔴)

- [x] **T027** [P] [US1] Contract test for POST /api/sessions - create `backend/tests/contract/sessions.contract.test.ts` expecting 201 with session_id, sentiment
- [x] **T028** [P] [US1] Contract test for POST /api/readings - create `backend/tests/contract/readings.contract.test.ts` expecting 201 with cards[], interpretation{}
- [x] **T029** [P] [US1] Integration test for full reading flow - create `backend/tests/integration/reading-flow.integration.test.ts` testing user input → sentiment → spread → draw → interpretation
- [x] **T030** [P] [US1] Unit test for CSPRNG card selection - create `backend/tests/unit/tarot-engine.test.ts` verifying randomness, seed reproducibility

**Run tests**: `npm test` → **FAILS** (endpoints don't exist) → Red ✅

### Database Models (US1)

- [x] **T031** [P] [US1] Create User model - add `users` table to `backend/prisma/schema.prisma` with id, email, line_id, locale, status
- [x] **T032** [P] [US1] Create Session model - add `sessions` table with id, user_id, channel, sentiment JSONB, topic_tags
- [x] **T033** [P] [US1] Create TarotDraw model - add `tarot_draws` table with id, session_id, spread_type, cards JSONB, interpretation JSONB
- [x] **T034** [US1] Run migrations - execute `npx prisma migrate dev --name init_user_story_1` to apply schema changes

### Backend Services (US1)

- [x] **T035** [US1] Implement sentiment analysis service - create `backend/src/services/sentiment-analyzer.ts` using OpenAI Moderation API with score, label, crisis_level
- [x] **T036** [US1] Implement CSPRNG Tarot Engine - create `backend/src/services/tarot-engine.ts` with `drawCards(spread_type, seed?)` using crypto.webcrypto
- [x] **T037** [US1] Implement crisis detection - create `backend/src/services/crisis-detector.ts` with keyword matching + sentiment threshold + zero-shot classification
- [x] **T038** [US1] Implement model router - create `backend/src/services/model-router.ts` selecting gpt-4o-mini default, with fallback strategy
- [x] **T039** [US1] Create interpretation prompts - create `backend/src/lib/prompts.ts` with INTERPRETATION_V1 template (TL;DR, key_points, advice, warnings structure)
- [x] **T040** [US1] Implement interpretation generator - create `backend/src/services/interpretation-generator.ts` calling model router with prompt template
- [x] **T040.5** [US1] Implement SSE streaming for long interpretations - add Server-Sent Events (SSE) streaming endpoint in `backend/src/api/readings.ts` for responses >200 tokens, stream interpretation segments as they generate to comply with constitution Principle IV (Token Cost Control)
- [x] **T041** [US1] Create conversation orchestrator - create `backend/src/services/orchestrator.ts` coordinating sentiment analysis → spread selection → card draw → interpretation generation in a linear state machine pattern (input → analysis → selection → drawing → interpretation → storage)

### Backend API Endpoints (US1)

- [x] **T042** [US1] Implement POST /api/sessions - create `backend/src/api/sessions.ts` accepting user_input, returning session with sentiment analysis
- [x] **T043** [US1] Implement POST /api/readings - create `backend/src/api/readings.ts` accepting session_id + spread_type, returning drawn cards + interpretation
- [x] **T044** [US1] Implement GET /api/readings/:id - create endpoint to retrieve past reading by ID with full interpretation
- [x] **T044.5** [US1] Implement POST /api/readings/:id/feedback - create endpoint in `backend/src/api/readings.ts` accepting rating (1-5 stars) and optional comment, store in `reading_feedback` table to support FR-019

**Run tests**: `npm test` → **PASSES** → Green ✅

### Refactor (Clean Code ♻️)

- [x] **T045** [US1] Refactor orchestrator - extract spread selection logic to separate function, add JSDoc comments
- [x] **T046** [US1] Add error handling - wrap all LLM calls in try-catch with retry logic, emit structured errors

**Run tests**: `npm test` → **STILL PASSES** → Refactor ✅

### Frontend Web (US1)

- [ ] **T047** [P] [US1] Create API client - create `frontend/src/services/api-client.ts` extending `shared/services/api-client-base.ts` (from T005.5) with typed fetch wrappers for sessions, readings endpoints
- [ ] **T048** [P] [US1] Create SessionProvider context - create `frontend/src/contexts/SessionContext.tsx` managing session state globally
- [ ] **T049** [US1] Create chat input component - create `frontend/src/components/ChatInput.tsx` with textarea, submit button, loading state
- [ ] **T050** [US1] Create card component - create `frontend/src/components/TarotCard.tsx` displaying card name, orientation, meaning
- [ ] **T051** [US1] Create spread layout component - create `frontend/src/components/SpreadLayout.tsx` positioning cards based on spread type
- [ ] **T052** [US1] Create interpretation display - create `frontend/src/components/InterpretationDisplay.tsx` showing TL;DR, key points, advice sections
- [ ] **T053** [US1] Create reading page - create `frontend/src/app/reading/page.tsx` composing chat input + spread + interpretation
- [ ] **T053.5** [US1] Add feedback rating component - create `frontend/src/components/FeedbackRating.tsx` with 5-star rating interface appearing after interpretation display, POST to `/api/readings/:id/feedback` endpoint to support FR-019 and SC-007
- [ ] **T054** [US1] Add crisis resource modal - create `frontend/src/components/CrisisModal.tsx` displaying mental health hotlines when crisis detected

### Mobile (US1)

- [ ] **T055** [P] [US1] Create navigation structure - setup `mobile/src/navigation/RootNavigator.tsx` with ReadingScreen, HistoryScreen
- [ ] **T056** [P] [US1] Create API client (mobile) - create `mobile/src/services/api-client.ts` extending `shared/services/api-client-base.ts` (from T005.5) and using shared types from `shared/types/api-contracts.ts`
- [ ] **T057** [US1] Create ReadingScreen - create `mobile/src/screens/ReadingScreen.tsx` with chat input, card display, interpretation
- [ ] **T058** [US1] Add loading indicators - implement ActivityIndicator for card drawing and interpretation generation phases

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can complete readings on web and mobile.

---

## Phase 4: User Story 2 - Returning User Memory & Context (Priority: P2)

**Goal**: Returning users see personalized recaps of past readings with semantic search for relevant context.

**Independent Test**: User who had reading 3 days ago returns → sees "Last time: The Chariot (career). How's your journey?" → can continue conversation with context.

### TDD: Write Failing Tests First (Red 🔴)

- [ ] **T059** [P] [US2] Contract test for GET /api/sessions/recent - create `backend/tests/contract/sessions.contract.test.ts` expecting last session summary
- [ ] **T060** [P] [US2] Integration test for memory recall - create `backend/tests/integration/memory-service.integration.test.ts` testing vector similarity search
- [ ] **T061** [P] [US2] Unit test for embedding generation - create `backend/tests/unit/embedding-service.test.ts` mocking OpenAI ada-002 responses

**Run tests**: `npm test` → **FAILS** → Red ✅

### Database Models (US2)

- [ ] **T062** [US2] Add pgvector extension - create migration `backend/prisma/migrations/add_pgvector.sql` executing `CREATE EXTENSION vector;`
- [ ] **T063** [US2] Create Memory model - add `memories` table to schema with id, user_id, session_id, summary, embedding vector(1536), metadata JSONB
- [ ] **T064** [US2] Add vector index - create HNSW index on `memories.embedding` for cosine similarity search
- [ ] **T065** [US2] Run migrations - execute `npx prisma migrate dev --name add_memory_system`

### Backend Services (US2)

- [ ] **T066** [US2] Implement embedding service - create `backend/src/services/embedding-service.ts` calling OpenAI ada-002 API with caching
- [ ] **T067** [US2] Implement memory service - create `backend/src/services/memory-service.ts` with `store(session, summary)` and `recall(user_id, query, limit=3)` using pgvector
- [ ] **T068** [US2] Create memory summarizer - create `backend/src/services/memory-summarizer.ts` generating concise session summaries from conversation + cards
- [ ] **T069** [US2] Update orchestrator - modify `backend/src/services/orchestrator.ts` to call `memory-service.recall()` before interpretation generation

### Backend API Endpoints (US2)

- [ ] **T070** [US2] Implement GET /api/sessions/recent - create endpoint in `backend/src/api/sessions.ts` returning last session with key cards, topic
- [ ] **T071** [US2] Implement POST /api/memories - create `backend/src/api/memories.ts` allowing manual memory storage (for testing)
- [ ] **T072** [US2] Update POST /api/readings - modify to auto-store memory after interpretation generation

**Run tests**: `npm test` → **PASSES** → Green ✅

### Refactor (Clean Code ♻️)

- [ ] **T073** [US2] Optimize vector search query - add query result caching with 1-hour TTL in Redis
- [ ] **T074** [US2] Add memory deduplication - prevent duplicate memories for same session

**Run tests**: `npm test` → **STILL PASSES** → Refactor ✅

### Frontend Web (US2)

- [ ] **T075** [US2] Create welcome banner component - create `frontend/src/components/WelcomeBack.tsx` displaying recent session recap
- [ ] **T076** [US2] Update reading page - modify `frontend/src/app/reading/page.tsx` to fetch and display welcome banner for returning users
- [ ] **T077** [US2] Add session history sidebar - create `frontend/src/components/SessionHistory.tsx` listing past 5 sessions with dates, topics

### Mobile (US2)

- [ ] **T078** [US2] Create HistoryScreen - create `mobile/src/screens/HistoryScreen.tsx` displaying past readings in scrollable list
- [ ] **T079** [US2] Add pull-to-refresh - implement RefreshControl on HistoryScreen to reload session data

**Checkpoint**: User Stories 1 AND 2 both work independently. Users get personalized context on return visits.

---

## Phase 5: User Story 4 - Free Tier Quota & Upgrade Prompts (Priority: P2)

**Goal**: Free users experience daily limits and see gentle upgrade prompts when quota exhausted.

**Independent Test**: Free user draws 3 single-card readings → attempts 4th → sees "Daily limit reached. Upgrade for unlimited access."

### TDD: Write Failing Tests First (Red 🔴)

- [ ] **T080** [P] [US4] Contract test for GET /api/users/me/quota - create `backend/tests/contract/users.contract.test.ts` expecting quota limits + usage
- [ ] **T081** [P] [US4] Integration test for quota enforcement - create `backend/tests/integration/quota.integration.test.ts` testing limit blocking
- [ ] **T082** [P] [US4] Unit test for quota calculation - create `backend/tests/unit/quota-service.test.ts` verifying daily reset logic

**Run tests**: `npm test` → **FAILS** → Red ✅

### Database Models (US4)

- [ ] **T083** [P] [US4] Create Subscription model - add `subscriptions` table with id, user_id, plan_id, platform, status, start_at, end_at
- [ ] **T084** [US4] Add quota tracking to sessions - alter `sessions` table to add `quota_consumed JSONB` storing daily usage counts
- [ ] **T085** [US4] Run migrations - execute `npx prisma migrate dev --name add_subscription_quota`

### Backend Services (US4)

- [ ] **T086** [US4] Implement quota service - create `backend/src/services/quota-service.ts` with `checkQuota(user, spread_type)` and `consumeQuota(user, spread_type)`
- [ ] **T087** [US4] Create subscription resolver - create `backend/src/services/subscription-service.ts` with `getActivePlan(user_id)` resolving plan from subscriptions table
- [ ] **T088** [US4] Update rate limiter - modify `backend/src/api/middleware/rate-limit.ts` to use different limits for free vs premium users

### Backend API Endpoints (US4)

- [ ] **T089** [US4] Implement GET /api/users/me/quota - create endpoint in `backend/src/api/users.ts` returning plan limits, used today, resets_at
- [ ] **T090** [US4] Update POST /api/readings - add quota check before card drawing, return 429 with upgrade message if exceeded
- [ ] **T091** [US4] Implement GET /api/plans - create `backend/src/api/plans.ts` listing available subscription plans with features comparison

**Run tests**: `npm test` → **PASSES** → Green ✅

### Refactor (Clean Code ♻️)

- [ ] **T092** [US4] Cache plan data - store plan features in Redis with 24h TTL to reduce DB queries
- [ ] **T093** [US4] Extract quota constants - move daily limits to `shared/constants/quotas.ts` for consistency

**Run tests**: `npm test` → **STILL PASSES** → Refactor ✅

### Frontend Web (US4)

- [ ] **T094** [P] [US4] Create quota display widget - create `frontend/src/components/QuotaWidget.tsx` showing remaining daily draws
- [ ] **T095** [P] [US4] Create upgrade modal - create `frontend/src/components/UpgradeModal.tsx` with plan comparison table, "Upgrade" CTA
- [ ] **T096** [US4] Add quota exhausted state - update `frontend/src/app/reading/page.tsx` to display upgrade modal when API returns 429
- [ ] **T097** [US4] Create subscription page - create `frontend/src/app/subscription/page.tsx` listing plans with Stripe Checkout integration

### Mobile (US4)

- [ ] **T098** [US4] Create SubscriptionScreen - create `mobile/src/screens/SubscriptionScreen.tsx` with plan cards, IAP purchase buttons
- [ ] **T099** [US4] Add quota banner - create `mobile/src/components/QuotaBanner.tsx` showing "2/3 daily draws used" at top of ReadingScreen

**Checkpoint**: User Story 4 complete. Free users experience quotas, premium path is clear.

---

## Phase 6: User Story 3 - Proactive Outreach & Reminders (Priority: P3)

**Goal**: Users receive timely email/LINE messages with check-ins and weekly summaries.

**Independent Test**: User inactive 7 days → receives email "We miss you!" → clicks link → lands on reading page with deep link.

### TDD: Write Failing Tests First (Red 🔴)

- [ ] **T100** [P] [US3] Integration test for inactivity trigger - create `backend/tests/integration/nudge-engine.integration.test.ts` simulating 7-day gap
- [ ] **T101** [P] [US3] Unit test for email template - create `backend/tests/unit/email-service.test.ts` verifying SendGrid payload structure
- [ ] **T102** [P] [US3] Contract test for deep linking - create `frontend/tests/e2e/deep-links.test.ts` using Playwright to verify link navigation

**Run tests**: `npm test` → **FAILS** → Red ✅

### Database Models (US3)

- [ ] **T103** [P] [US3] Create Nudge model - add `nudges` table with id, user_id, trigger_type, template_id, channel, sent_at, status
- [ ] **T104** [P] [US3] Create Event model - add `events` table with id, user_id, type, payload JSONB, ts for analytics
- [ ] **T105** [US3] Run migrations - execute `npx prisma migrate dev --name add_nudge_system`

### Backend Services (US3)

- [ ] **T106** [US3] Implement nudge engine - create `backend/src/services/nudge-engine.ts` with trigger evaluators (inactivity, mood_decline, time-based)
- [ ] **T107** [US3] Implement email service - create `backend/src/services/email-service.ts` wrapping SendGrid SDK with template rendering
- [ ] **T108** [US3] Implement LINE messaging service - create `backend/src/services/line-service.ts` using LINE Messaging API for Flex Messages
- [ ] **T109** [US3] Create weekly summary generator - create `backend/src/services/summary-generator.ts` aggregating past week's sessions into personalized recap
- [ ] **T110** [US3] Implement deep link handler - create `backend/src/services/deep-link-service.ts` generating signed URLs with session context

### Backend Workers (US3)

- [ ] **T111** [US3] Create nudge scheduler - create `backend/src/workers/nudge-scheduler.ts` cron job checking trigger conditions every 6 hours
- [ ] **T112** [US3] Create event processor - create `backend/src/workers/event-processor.ts` consuming Kinesis events for A/B analytics

### Backend API Endpoints (US3)

- [ ] **T113** [US3] Implement POST /api/nudges - create `backend/src/api/nudges.ts` for manual nudge triggering (admin/testing)
- [ ] **T114** [US3] Implement GET /api/deep-link/verify - create endpoint validating signed deep link tokens and returning session context

**Run tests**: `npm test` → **PASSES** → Green ✅

### Refactor (Clean Code ♻️)

- [ ] **T115** [US3] Extract email templates - move HTML templates to `backend/src/templates/emails/` directory
- [ ] **T116** [US3] Add nudge deduplication - prevent sending duplicate nudges within 48-hour window

**Run tests**: `npm test` → **STILL PASSES** → Refactor ✅

### Frontend Web (US3)

- [ ] **T117** [US3] Implement deep link routing - update `frontend/src/app/reading/page.tsx` to parse `?session=xxx` query param and load session
- [ ] **T118** [US3] Add email unsubscribe page - create `frontend/src/app/unsubscribe/page.tsx` allowing users to opt out of nudges

### Mobile (US3)

- [ ] **T119** [US3] Configure deep linking - setup Expo Linking config in `mobile/app.json` for `aitarotfriend://reading/:sessionId`
- [ ] **T120** [US3] Handle push notifications - implement `mobile/src/services/push-notifications.ts` using Expo Notifications API

**Checkpoint**: User Story 3 complete. Users receive proactive outreach via email/LINE with working deep links.

---

## Phase 7: User Story 5 - Premium Subscription Benefits (Priority: P3)

**Goal**: Premium users enjoy unlimited draws, 7-card spreads, theme packs, and multi-device sync.

**Independent Test**: Premium user draws 7-card spread on phone → customizes to kawaii theme → opens web on laptop → sees same reading history.

### TDD: Write Failing Tests First (Red 🔴)

- [ ] **T121** [P] [US5] Contract test for POST /api/subscriptions - create `backend/tests/contract/subscriptions.contract.test.ts` expecting Stripe client_secret
- [ ] **T122** [P] [US5] Integration test for IAP verification - create `backend/tests/integration/iap-service.integration.test.ts` mocking Apple/Google APIs
- [ ] **T123** [P] [US5] E2E test for multi-device sync - create `frontend/tests/e2e/sync.test.ts` verifying reading appears on second device

**Run tests**: `npm test` → **FAILS** → Red ✅

### Backend Services (US5)

- [ ] **T124** [US5] Implement payment service (Stripe) - create `backend/src/services/payment-service.ts` with `createSubscription(user, plan)` and webhook handler
- [ ] **T125** [US5] Implement IAP verification service - create `backend/src/services/iap-service.ts` verifying iOS receipts (StoreKit 2) and Android tokens (Play Billing)
- [ ] **T126** [US5] Create subscription sync service - create `backend/src/services/subscription-sync.ts` updating subscription table from webhooks
- [ ] **T127** [US5] Implement priority queue - modify `backend/src/services/orchestrator.ts` to check user tier and prioritize premium requests

### Backend API Endpoints (US5)

- [ ] **T128** [US5] Implement POST /api/subscriptions - create endpoint for web Stripe checkout
- [ ] **T129** [US5] Implement POST /api/subscriptions/verify-iap - create endpoint for mobile IAP verification
- [ ] **T130** [US5] Implement POST /api/webhooks/stripe - create webhook handler for subscription.created, subscription.updated, subscription.deleted events
- [ ] **T131** [US5] Implement GET /api/users/me/subscription - create endpoint returning current subscription status

**Run tests**: `npm test` → **PASSES** → Green ✅

### Refactor (Clean Code ♻️)

- [ ] **T132** [US5] Add webhook signature verification - ensure Stripe webhook secret validation to prevent spoofing
- [ ] **T133** [US5] Implement idempotent subscription updates - use event.id for deduplication

**Run tests**: `npm test` → **STILL PASSES** → Refactor ✅

### Frontend Web (US5)

- [ ] **T134** [P] [US5] Integrate Stripe Checkout - add Stripe.js to `frontend/src/app/subscription/page.tsx` with Elements provider
- [ ] **T135** [P] [US5] Create theme selector - create `frontend/src/components/ThemeSelector.tsx` allowing premium users to choose visual themes
- [ ] **T136** [US5] Implement theme application - create `frontend/src/contexts/ThemeContext.tsx` applying CSS variables based on selected theme
- [ ] **T137** [US5] Add 7-card spread UI - extend `frontend/src/components/SpreadLayout.tsx` to handle 7-card relationship spread positioning

### Mobile (US5)

- [ ] **T138** [US5] Integrate iOS IAP - implement `mobile/src/services/iap-ios.ts` using react-native-iap for StoreKit 2 purchases
- [ ] **T139** [US5] Integrate Android IAP - implement `mobile/src/services/iap-android.ts` using Google Play Billing Library 5
- [ ] **T140** [US5] Add subscription management screen - create `mobile/src/screens/ManageSubscriptionScreen.tsx` showing current plan, renewal date, cancel option

**Checkpoint**: All user stories complete. Premium users have full feature access with multi-platform support.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, observability, security, performance.

### Observability (G7)

- [ ] **T141** [P] [Polish] Setup Prometheus metrics - create `backend/src/lib/metrics.ts` exposing /metrics endpoint with API latency, error rate, token usage
- [ ] **T142** [P] [Polish] Configure Grafana dashboards - create `infra/grafana/dashboards/slo-dashboard.json` with P95 latency, uptime, token budget panels
- [ ] **T143** [P] [Polish] Add distributed tracing spans - instrument critical paths (orchestrator, LLM calls, DB queries) with OpenTelemetry spans
- [ ] **T144** [P] [Polish] Create alerting rules - define Grafana alerts for SLO violations (P95 > 800ms, uptime < 99.9%, token budget > 105%)

### Security (G7)

- [ ] **T145** [P] [Polish] Run OWASP ZAP scan - create `.github/workflows/security.yml` running DAST against staging environment
- [ ] **T146** [P] [Polish] Implement content security policy - add CSP headers to Next.js middleware blocking inline scripts
- [ ] **T147** [P] [Polish] Add SQL injection prevention - review all raw SQL queries, migrate to Prisma parameterized queries
- [ ] **T148** [P] [Polish] Setup secrets rotation - configure AWS Secrets Manager auto-rotation for database credentials, API keys

### Performance Optimization

- [ ] **T149** [Polish] Optimize card meaning cache - preload all 78 cards into Redis on startup with no expiry
- [ ] **T150** [Polish] Add database indexes - create indexes on `sessions(user_id, created_at)`, `tarot_draws(user_id, created_at)` for history queries
- [ ] **T151** [Polish] Implement response compression - enable gzip/brotli compression in Express.js for JSON responses
- [ ] **T152** [Polish] Setup CDN for static assets - configure CloudFront or equivalent for frontend assets, card images

### Testing & Quality Assurance (G8)

- [ ] **T153** [P] [Polish] Run Lighthouse CI - create `.github/workflows/lighthouse.yml` auditing web performance, accessibility, SEO
- [ ] **T154** [P] [Polish] Implement load testing - create `backend/tests/load/api-load.test.ts` using k6 to simulate 500 concurrent users
- [ ] **T155** [P] [Polish] Add E2E mobile tests - create `mobile/tests/e2e/reading-flow.test.ts` using Detox for iOS/Android automation
- [ ] **T156** [Polish] Achieve 80% code coverage - add missing unit tests to reach coverage threshold, enforce in CI

### Documentation & Developer Experience

- [ ] **T157** [P] [Polish] Generate API documentation - run `npx @openapitools/openapi-generator-cli` to create docs from `contracts/openapi.yaml`
- [ ] **T158** [P] [Polish] Create architecture diagrams - document system architecture in `docs/architecture.md` with Mermaid diagrams
- [ ] **T159** [P] [Polish] Write TDD guide - document Red-Green-Refactor examples in `docs/tdd-guide.md` with LLM testing patterns
- [ ] **T160** [P] [Polish] Update README quickstart - ensure `README.md` reflects final monorepo structure, setup steps

### Deployment & Operations (G9)

- [ ] **T161** [Polish] Create Dockerfile for backend - create `backend/Dockerfile` with multi-stage build, non-root user
- [ ] **T162** [Polish] Create Dockerfile for frontend - create `frontend/Dockerfile` with Next.js standalone output
- [ ] **T163** [Polish] Setup Terraform infrastructure - create `infra/terraform/` with ECS, RDS, ElastiCache, S3 definitions
- [ ] **T164** [Polish] Implement feature flags - integrate LaunchDarkly or create custom flag system for gradual rollout
- [ ] **T165** [Polish] Create deployment runbook - document rollback procedures, health check endpoints in `docs/runbook.md`

### Administrative Backend (FR-018 Implementation)

- [ ] **T166** [P] [Polish] Implement user profile management API - create `backend/src/api/admin/users.ts` with endpoints for viewing/editing user profiles, status management, LINE ID linking
- [ ] **T167** [P] [Polish] Create reading history review interface - create `backend/src/api/admin/readings.ts` allowing admins to view user reading history, interpretations, and usage patterns for support purposes
- [ ] **T168** [P] [Polish] Implement mood trend analytics - create `backend/src/services/analytics-service.ts` aggregating sentiment scores over time, detecting patterns, generating visualizations for CRM analysis
- [ ] **T169** [P] [Polish] Build message template A/B testing system - create `backend/src/api/admin/templates.ts` for managing nudge message templates, variants, and tracking CTR performance metrics
- [ ] **T170** [P] [Polish] Create card meaning configuration editor - create `backend/src/api/admin/cards.ts` allowing CMS editors to update card meanings, spreads, and position descriptions without code deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - **US1 (P1)**: Can start after Foundational - No dependencies on other stories
  - **US2 (P2)**: Can start after Foundational - Enhances US1 but independent
  - **US4 (P2)**: Can start after Foundational - Independent quota system
  - **US3 (P3)**: Depends on US2 (memory system for summaries)
  - **US5 (P3)**: Depends on US4 (subscription infrastructure)
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2) - MUST complete first
    ↓
    ├─→ US1 (P1): Initial Reading ────────────┐
    │                                         │
    ├─→ US2 (P2): Memory & Context ──────┐    │
    │                                    │    │
    ├─→ US4 (P2): Quota & Upgrade ───┐   │    │
    │                                │   │    │
    │   (US3 needs US2's memory)    │   │    │
    └─→ US3 (P3): Proactive Outreach ←──┘    │
                                             │
        (US5 needs US4's subscription)       │
        US5 (P3): Premium Features ←─────────┘
                ↓
        Polish (Phase 8)
```

### Within Each User Story

- **TDD Order**: Tests → Models → Services → API Endpoints → Frontend → Mobile
- Models before services (services depend on DB schema)
- Services before endpoints (endpoints call services)
- API complete before frontend integration
- Core implementation before refactoring

### Parallel Opportunities

**Phase 1 (Setup)**: T001-T013 can run in parallel (different packages)

**Phase 2 (Foundational)**:
- T014-T016 (DB setup) must be sequential
- T017-T019 (Auth) can run parallel after DB
- T020-T023 (Core services) can run parallel
- T024-T026 (Seeding) must run after DB setup

**User Story 1**:
- T027-T030 (Tests) can run in parallel
- T031-T033 (Models) can run in parallel after tests
- T035-T041 (Services) dependencies: T035→T037→T040→T041 sequential, T036, T038, T039 parallel
- T047-T048 (Frontend API client) can run parallel
- T055-T056 (Mobile setup) can run parallel

**User Story 2**:
- T059-T061 (Tests) parallel
- T062-T064 (DB changes) sequential
- T066-T068 (Services) parallel
- T075-T077 (Frontend) parallel

---

## Parallel Example: User Story 1

```bash
# RED: Write all tests in parallel
Task: "Contract test for POST /api/sessions" (T027)
Task: "Contract test for POST /api/readings" (T028)
Task: "Integration test for full reading flow" (T029)
Task: "Unit test for CSPRNG card selection" (T030)

# Run: npm test → ALL FAIL → Red ✅

# GREEN: Create models in parallel (after DB migration)
Task: "Create User model" (T031)
Task: "Create Session model" (T032)
Task: "Create TarotDraw model" (T033)

# GREEN: Create parallel services
Task: "Implement CSPRNG Tarot Engine" (T036)
Task: "Implement model router" (T038)
Task: "Create interpretation prompts" (T039)

# Run: npm test → ALL PASS → Green ✅

# REFACTOR: Clean up code
Task: "Refactor orchestrator" (T045)
Task: "Add error handling" (T046)

# Run: npm test → STILL PASS → Refactor ✅
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T013)
2. Complete Phase 2: Foundational (T014-T026) **CRITICAL - blocks all stories**
3. Complete Phase 3: User Story 1 (T027-T058)
4. **STOP and VALIDATE**: Test US1 independently end-to-end
5. Deploy to staging, demo to stakeholders
6. **MVP SHIPPED** - users can get tarot readings

### Incremental Delivery

1. Foundation (Setup + Foundational) → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Add User Story 2 + User Story 4 → Test independently → Deploy (Memory + Monetization)
4. Add User Story 3 + User Story 5 → Test independently → Deploy (Engagement + Premium)
5. Polish (Phase 8) → Production-ready

### Parallel Team Strategy

With 2-3 developers:

1. **Week 1-2**: Team completes Setup + Foundational together (T001-T026)
2. **Week 3-4**: Once Foundational done:
   - Developer A: User Story 1 (T027-T058)
   - Developer B: Start User Story 2 prep (research vector search)
3. **Week 5-6**:
   - Developer A: User Story 4 (T080-T099)
   - Developer B: User Story 2 (T059-T079)
   - Developer C: Polish observability (T141-T144)
4. **Week 7-8**:
   - Developer A: User Story 3 (T100-T120)
   - Developer B: User Story 5 (T121-T140)
5. **Week 9-10**: All team on Polish (T141-T165) + beta launch

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] labels** map tasks to user stories for traceability
- **TDD mandatory**: All user stories follow Red-Green-Refactor
- **Independent stories**: Each story deliverable and testable standalone
- Verify tests fail (Red) before implementing (Green)
- Commit after passing tests or logical refactor group
- Stop at checkpoints to validate story independently
- Avoid cross-story dependencies that break independence

---

**Total Tasks**: 174
**Breakdown**:
- Setup: 14 tasks (added T005.5 for shared API client)
- Foundational: 13 tasks
- User Story 1 (P1): 35 tasks (added T040.5 streaming, T044.5 feedback endpoint, T053.5 feedback UI)
- User Story 2 (P2): 21 tasks
- User Story 4 (P2): 20 tasks
- User Story 3 (P3): 21 tasks
- User Story 5 (P3): 20 tasks
- Polish & Cross-Cutting: 30 tasks (added T166-T170 for admin backend)

**Parallel Opportunities**: ~65 tasks marked [P] can run concurrently with proper team allocation

**MVP Scope**: Phases 1-3 (T001-T058 + new tasks) = 61 tasks for core reading functionality with feedback
