-- TarotFriend DAL — Test Schema DDL
-- Creates all tables across all 5 databases in a single PostgreSQL instance
-- for integration testing purposes.

-- ────────────────────────────────────────────────────────
-- Customer DB Tables
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "customer" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    locale        VARCHAR(10) DEFAULT 'zh-TW',
    tier          VARCHAR(20) DEFAULT 'free',
    status        VARCHAR(20) DEFAULT 'active',
    birth_date    VARCHAR(20),
    birth_time    VARCHAR(10),
    birth_city    VARCHAR(100),
    birth_lat     DOUBLE PRECISION,
    birth_lng     DOUBLE PRECISION,
    zodiac_sign   VARCHAR(20),
    chinese_zodiac VARCHAR(20),
    five_element  VARCHAR(20),
    occupation    VARCHAR(100),
    industry      VARCHAR(100),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "customer_contact" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES "customer"(id),
    nickname      VARCHAR(100) NOT NULL,
    relationship  VARCHAR(20) NOT NULL,
    birth_date    VARCHAR(20),
    birth_time    VARCHAR(10),
    birth_city    VARCHAR(100),
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "customer_birth_chart" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES "customer"(id),
    owner_type    VARCHAR(20) NOT NULL,
    contact_id    UUID,
    chart_type    VARCHAR(20) NOT NULL,
    partner_id    UUID,
    document_ref  VARCHAR(255),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "customer_address" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES "customer"(id),
    label         VARCHAR(20) DEFAULT 'home',
    recipient     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city          VARCHAR(50) NOT NULL,
    district      VARCHAR(50),
    postal_code   VARCHAR(10) NOT NULL,
    country       VARCHAR(5) DEFAULT 'TW',
    is_default    BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "tag" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) UNIQUE NOT NULL,
    category      VARCHAR(30) NOT NULL,
    color         VARCHAR(10),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "customer_tag" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES "customer"(id),
    tag_id        UUID NOT NULL REFERENCES "tag"(id),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS "finance_record" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES "customer"(id),
    type          VARCHAR(30) NOT NULL,
    amount        DECIMAL NOT NULL,
    currency      VARCHAR(5) DEFAULT 'TWD',
    reference_id  VARCHAR(100),
    description   TEXT,
    status        VARCHAR(20) DEFAULT 'pending',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "customer_consent" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES "customer"(id),
    consent_type  VARCHAR(50) NOT NULL,
    granted       BOOLEAN DEFAULT FALSE,
    granted_at    TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ,
    ip_address    VARCHAR(50),
    UNIQUE(customer_id, consent_type)
);

CREATE TABLE IF NOT EXISTS "customer_note" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES "customer"(id),
    author_id     UUID NOT NULL,
    content       TEXT NOT NULL,
    category      VARCHAR(20) DEFAULT 'general',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- Caring DB Tables
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "caring_plan" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL,
    type            VARCHAR(30) NOT NULL,
    frequency       VARCHAR(20),
    channel         VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',
    next_trigger_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "caring_action" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id       UUID REFERENCES "caring_plan"(id),
    customer_id   UUID NOT NULL,
    channel       VARCHAR(20) NOT NULL,
    template_id   UUID,
    content       TEXT,
    status        VARCHAR(20) DEFAULT 'sent',
    sent_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "sentiment_history" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL,
    source        VARCHAR(50) NOT NULL,
    score         NUMERIC(3,2),
    label         VARCHAR(20),
    source_ref_id VARCHAR(100),
    recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "caring_rule" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    condition     JSONB NOT NULL,
    action        JSONB NOT NULL,
    priority      INTEGER DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "caring_template" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    channel       VARCHAR(20) NOT NULL,
    locale        VARCHAR(10) DEFAULT 'zh-TW',
    subject       VARCHAR(200),
    body          TEXT NOT NULL,
    variables     JSONB DEFAULT '[]',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────
-- Shop DB Tables
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "shopify_customer_map" (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id           UUID NOT NULL,
    shopify_customer_id   VARCHAR(100) UNIQUE NOT NULL,
    shopify_email         VARCHAR(255),
    synced_at             TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "webhook_event_log" (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_webhook_id    VARCHAR(100) UNIQUE NOT NULL,
    topic                 VARCHAR(100) NOT NULL,
    shopify_resource_id   VARCHAR(100),
    payload               JSONB,
    processed_at          TIMESTAMPTZ,
    status                VARCHAR(20) DEFAULT 'pending',
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_topic ON "webhook_event_log"(topic);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON "webhook_event_log"(status);

-- ────────────────────────────────────────────────────────
-- Scheduler DB Tables
-- ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tarotist" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    bio           TEXT,
    avatar_url    VARCHAR(500),
    specialties   JSONB DEFAULT '[]',
    rating        DECIMAL DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    hourly_rate   DECIMAL,
    currency      VARCHAR(5) DEFAULT 'TWD',
    status        VARCHAR(20) DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "availability" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarotist_id   UUID NOT NULL REFERENCES "tarotist"(id),
    day_of_week   INTEGER,
    start_time    VARCHAR(10) NOT NULL,
    end_time      VARCHAR(10) NOT NULL,
    is_recurring  BOOLEAN DEFAULT TRUE,
    specific_date VARCHAR(20),
    is_available  BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "appointment" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL,
    tarotist_id   UUID NOT NULL REFERENCES "tarotist"(id),
    start_at      TIMESTAMPTZ NOT NULL,
    end_at        TIMESTAMPTZ NOT NULL,
    type          VARCHAR(20) DEFAULT 'online',
    status        VARCHAR(20) DEFAULT 'pending',
    topic         VARCHAR(200),
    meeting_url   VARCHAR(500),
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "review" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id  UUID NOT NULL REFERENCES "appointment"(id),
    customer_id     UUID NOT NULL,
    tarotist_id     UUID NOT NULL REFERENCES "tarotist"(id),
    rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
