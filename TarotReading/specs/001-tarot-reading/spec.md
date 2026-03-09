# Feature Specification: AI Tarot Friend

**Feature Branch**: `001-tarot-reading`
**Created**: 2025-10-08
**Status**: Draft
**Input**: AI Tarot Friend — 傾聽、占卜、記憶、主動關懷

## User Scenarios & Testing

### User Story 1 - Initial Tarot Reading Session (Priority: P1)

Users can engage in a conversational tarot reading where the system listens to their concerns, recommends an appropriate spread, and provides empathetic interpretation with actionable guidance.

**Why this priority**: This is the core value proposition - delivering empathetic, context-aware tarot guidance. Without this, there is no product.

**Independent Test**: A user can open the app, share a concern (e.g., "I'm worried about my career change"), receive a spread suggestion, draw cards, and get a complete interpretation with action steps - all in a single session without requiring any other features.

**Acceptance Scenarios**:

1. **Given** a new user opens the app, **When** they type their concern in natural language (Chinese or English), **Then** the system detects emotional tone and suggests an appropriate spread (1-card, 3-card, or 7-card)
2. **Given** the user accepts a spread recommendation, **When** they initiate card drawing, **Then** the system uses cryptographically secure random generation to select cards with upright or reversed positions
3. **Given** cards have been drawn, **When** the system generates interpretation, **Then** it provides: TL;DR summary, 3-5 key insights, short/medium/long-term action recommendations, and risk awareness (avoiding fatalistic language)
4. **Given** the user expresses distress indicating mental health concerns, **When** the system detects crisis patterns, **Then** it provides mental health resource referrals and adjusts interpretation tone appropriately

---

### User Story 2 - Returning User Memory & Context (Priority: P2)

Returning users are greeted with a personalized recap of their previous reading highlights and recent life context, creating continuity and deepening trust.

**Why this priority**: Memory and continuity differentiate this from one-time tarot apps and build long-term engagement. However, the system can provide value without this (P1 standalone).

**Independent Test**: A user who had a reading 3 days ago returns to the app. They see a summary like "Last time we explored your career concerns - you drew The Chariot. How has your journey progressed?" The user can continue without re-explaining context.

**Acceptance Scenarios**:

1. **Given** a user returns after a previous session, **When** they open the app, **Then** the system displays highlights from the last reading (date, main topic, key cards drawn) and asks about progress
2. **Given** the system has stored conversation history, **When** generating the recap, **Then** it uses semantic vector search to identify the most relevant past topics and life areas (session → topic → life_area hierarchy)
3. **Given** the user's emotional tone has shifted significantly from previous sessions, **When** the system detects this change, **Then** it acknowledges the shift and offers appropriate support

---

### User Story 3 - Proactive Outreach & Reminders (Priority: P3)

Users receive timely email or LINE messages with personalized check-ins, weekly/monthly summaries, and gentle reminders to return when they haven't engaged recently.

**Why this priority**: Proactive care drives retention and demonstrates genuine concern, but requires working P1 (readings) and P2 (memory). Can be delivered after core experience is solid.

**Independent Test**: A user who hasn't logged in for 7 days receives an email: "Hi [name], it's been a week since we last connected. We're here whenever you need guidance." Clicking the link opens the app directly to a conversation thread or card-drawing interface.

**Acceptance Scenarios**:

1. **Given** a user hasn't interacted for 7 days, **When** the condition-based trigger fires, **Then** the system sends a personalized check-in message via their preferred channel (email or LINE)
2. **Given** the user's mood trend has declined over 3+ sessions, **When** the system detects this pattern, **Then** it triggers a supportive outreach message with care resources
3. **Given** it's been 7 or 30 days since the user's first reading, **When** the time-based trigger fires, **Then** the system sends a weekly or monthly reflection summary
4. **Given** the user clicks a link in an outreach message, **When** they authenticate, **Then** they land directly in the conversation or card-drawing interface (deep linking)

---

### User Story 4 - Free Tier Quota & Upgrade Prompts (Priority: P2)

Free users can experience limited daily readings (1 single-card up to 3 times, 1 three-card reading) and are gently guided to upgrade when they want more depth or frequency.

**Why this priority**: Monetization is critical for sustainability, but must not block MVP validation. This enables business model testing while P1 proves core value.

**Independent Test**: A free user draws their daily 3 cards. When they try to draw again that day, they see: "You've used today's free readings. Upgrade to Premium for unlimited access and deeper insights." They can view pricing without being blocked from all functionality.

**Acceptance Scenarios**:

1. **Given** a free-tier user, **When** they check their quota, **Then** the system shows: 1 single-card draw remaining (max 3/day), 1 three-card draw remaining (1/day)
2. **Given** a free user has exhausted daily quota, **When** they attempt another reading, **Then** the system displays upgrade options with clear benefit comparison (higher quota, deeper analysis, theme packs, priority queue, multi-device sync)
3. **Given** a free user wants to access a 7-card relationship spread, **When** they select it, **Then** the system explains this is a premium feature and shows subscription plans

---

### User Story 5 - Premium Subscription Benefits (Priority: P3)

Paying subscribers enjoy enhanced limits, advanced interpretations, exclusive theme packs, priority response times, and seamless multi-device synchronization.

**Why this priority**: Premium features increase LTV but require proven product-market fit first. Builds on P2 (quota system) and P1 (core readings).

**Independent Test**: A premium user draws a 7-card relationship spread on their phone. The interpretation includes extended thematic analysis and visual theme customization. Later, they open the web app on their laptop and see the same reading history synchronized.

**Acceptance Scenarios**:

1. **Given** a premium subscriber, **When** they draw cards, **Then** they have access to all spread types (including 7-card and Celtic Cross), unlimited daily draws, and extended interpretation depth
2. **Given** a premium user selects a theme pack, **When** rendering the interface, **Then** the system applies custom visual styling (e.g., kawaii aesthetic, celestial theme)
3. **Given** a premium user generates a reading on one device, **When** they log in on another device, **Then** their full reading history, preferences, and ongoing conversations sync automatically
4. **Given** peak system load, **When** premium and free users request readings simultaneously, **Then** premium requests are prioritized in the processing queue

---

### Edge Cases

- **What happens when a user requests a reading but provides no context?** The system asks clarifying questions or defaults to a general 1-card daily guidance draw.
- **How does the system handle inappropriate or abusive language?** The system reminds users of respectful communication guidelines and logs incidents for review. Repeated violations may trigger account restrictions.
- **What if a user wants to replay a past reading with the same card sequence?** Premium users can input a seed value to reproduce exact card draws for reflection purposes.
- **How does the system respond if external services (email/LINE) are unavailable?** Outreach messages are queued and retried with exponential backoff. Users are not blocked from in-app functionality.
- **What happens if a user in a restricted region tries to access the service?** The system checks regional compliance requirements and may limit certain features (e.g., payment processing) while still providing core reading functionality where legally permissible.

## Requirements

### Functional Requirements

- **FR-001**: System MUST support text-based conversational interaction in Chinese and English
- **FR-002**: System MUST detect emotional tone from user input and adapt response empathy accordingly
- **FR-003**: System MUST support card spreads: 1-card (quick insight), 3-card (past/present/future), 7-card (relationship dynamics)
- **FR-004**: System MUST use cryptographically secure pseudo-random number generation (CSPRNG) for card selection to ensure fairness
- **FR-005**: System MUST allow users to input a random seed value to replay specific card sequences (for premium users)
- **FR-006**: System MUST generate interpretations using a structured template: TL;DR, 3-5 key points, actionable advice (short/medium/long-term), gentle warnings
- **FR-007**: System MUST store user conversation history with semantic tagging (session → topic → life_area hierarchy)
- **FR-008**: System MUST implement vector-based semantic search to retrieve relevant past context for returning users
- **FR-009**: System MUST detect mental health crisis indicators (expressions of self-harm, severe depression, suicidal ideation) and provide immediate resource referrals
- **FR-010**: System MUST enforce free-tier quotas: 1 single-card draw (max 3 uses/day), 1 three-card draw (max 1 use/day)
- **FR-011**: System MUST support subscription tiers (free, premium) with clear feature differentiation
- **FR-012**: System MUST process in-app purchases on iOS and Android platforms
- **FR-013**: System MUST process credit card payments for web subscriptions
- **FR-014**: System MUST send condition-triggered outreach (e.g., mood decline, 7-day inactivity)
- **FR-015**: System MUST send time-triggered outreach (weekly/monthly reflections)
- **FR-016**: System MUST support deep linking from email/LINE messages to specific app screens (conversation, card drawing)
- **FR-017**: System MUST synchronize user data (reading history, preferences, conversations) across multiple devices for premium users
- **FR-018**: System MUST provide an administrative backend for: user profile management, reading history review, mood trend analytics, message template A/B testing, card meaning/spread configuration
- **FR-019**: System MUST collect user satisfaction ratings after readings to measure interpretation quality (supports SC-007)

### Key Entities

- **User**: Unique identifier, display name, email, LINE ID, preferred language, subscription tier, emotional profile, device list
- **Session**: Unique identifier, user reference, timestamp, conversation thread, emotional state snapshot
- **Reading**: Unique identifier, session reference, spread type, cards drawn (with positions and orientations), interpretation text, seed value (if provided)
- **Card**: Card ID (78 total: 22 Major Arcana + 56 Minor Arcana), name (multilingual), upright meaning, reversed meaning, symbolic imagery reference
- **Spread**: Spread type identifier, name, card count, position meanings (e.g., "Past" for 3-card position 1)
- **Topic**: Topic identifier, session reference, semantic vector embedding, life area classification (e.g., career, relationships, personal growth)
- **Nudge (Outreach Message)**: Message identifier, user reference, trigger type (condition/time), channel (email/LINE), delivery status, sent timestamp
- **Subscription**: Subscription identifier, user reference, tier (free/premium), start date, renewal date, payment method, status (active/canceled/expired)
- **Admin User**: Admin identifier, username, role (operator/CRM analyst/CMS editor), permissions

## Success Criteria

### Measurable Outcomes

- **SC-001**: System achieves Monthly Active Users (MAU) ≥ 10,000 within 6 months of public launch
- **SC-002**: Day-7 retention rate (D7) ≥ 28% indicating users find ongoing value in returning
- **SC-003**: Free-to-paid conversion rate ≥ 4% demonstrating willingness to pay for premium features
- **SC-004**: Proactive outreach messages achieve click-through rate (CTR) ≥ 12% showing engagement effectiveness
- **SC-005**: 95% of reading requests complete interpretation delivery within 5 seconds (user-perceived responsiveness)
- **SC-006**: System maintains 99.9% uptime availability for core reading functionality
- **SC-007**: Users rate interpretation quality ≥ 4.2/5.0 on average (measured via in-app feedback)
- **SC-008**: 90% of new users successfully complete their first reading session without abandonment
- **SC-009**: Mental health crisis detection triggers appropriate referrals within 2 seconds of identification
- **SC-010**: Multi-device sync completes within 3 seconds of login on a new device (for premium users)

## Assumptions

1. **Target Audience**: Primary users are adults (18-45) in Taiwan/Hong Kong markets who are familiar with tarot as a self-reflection tool and comfortable with mobile/web apps
2. **Language Support**: Initial launch focuses on Traditional Chinese and English; Simplified Chinese and other languages deferred to post-MVP
3. **Tarot System**: Rider-Waite deck is the standard; other deck systems (Thoth, Marseille) are out of scope for MVP
4. **Spread Complexity**: Celtic Cross (10-card) spread is marked as milestone M1 (post-MVP); initial launch includes 1-card, 3-card, and 7-card spreads
5. **Payment Processing**: Assumes standard platform payment integrations (Apple In-App Purchase, Google Play Billing, Stripe for web) without custom payment gateway development
6. **Regulatory Compliance**: Service is positioned as entertainment/self-reflection, not professional fortune-telling or licensed therapy; users acknowledge this in terms of service
7. **Data Retention**: User conversation history retained for 2 years by default; users can export or delete data on request per privacy regulations
8. **Outreach Channels**: Email (SMTP via SendGrid/similar) and LINE messaging API are initial channels; SMS/WhatsApp/WeChat deferred based on market demand
9. **Admin Access**: Backend administration is web-based; no mobile admin app in MVP scope
10. **AI Model**: Interpretation generation uses managed AI API services (e.g., OpenAI, Anthropic) rather than self-hosted models; cost management relies on caching and small model selection per constitution principle IV

## Dependencies

- **External AI API Service**: Requires stable access to LLM provider for interpretation generation (availability SLA, rate limits, token costs)
- **Payment Platforms**: Dependent on Apple App Store, Google Play, and payment processor (Stripe/similar) operational status and policy compliance
- **Messaging Services**: Email delivery via SendGrid (or equivalent) and LINE Messaging API availability
- **Mobile Platform Guidelines**: Must comply with App Store and Play Store content policies regarding divination/spiritual content (subject to review approval)
- **Vector Database**: Requires vector storage and similarity search capability for semantic memory retrieval (managed service or self-hosted)

## Out of Scope (MVP)

- Voice input/output for readings
- Video or live chat with human tarot readers
- Social features (sharing readings, friend networks, community forums)
- Physical card deck sales or integration with physical deck scanning
- Integration with calendar/scheduling apps for reading reminders
- Astrological calculations or birth chart integration
- Custom card deck creation tools for users
- Gamification elements (achievements, badges, leaderboards)
- Third-party integrations (Notion, Evernote, journaling apps)
- Offline mode functionality
