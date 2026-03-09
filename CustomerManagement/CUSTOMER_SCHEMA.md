# Customer Profiling Schema Design

> CustomerManagement 服務的多儲存引擎資料模型設計
> 版本: v0.5.0 — Draft（技術選型 TBD，先定義儲存型態 + 命理資料 + 人際圈分支）

---

## 0. 六種儲存型態定義（技術選型無關）

> 先從「資料本質」出發，定義每種資料該用什麼**型態**的儲存引擎，
> 具體產品（PostgreSQL / MongoDB / Qdrant / Neo4j ...）後續再決定。

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Customer Data — 六種儲存型態                        │
├──────────┬──────────────┬──────────────────┬────────────────────────┤
│ 儲存型態  │ 資料特性      │ 存什麼            │ 讀寫模式               │
├──────────┼──────────────┼──────────────────┼────────────────────────┤
│          │              │                  │                        │
│ ① 關聯式  │ 結構固定      │ 客戶 Profile      │ 讀多寫少               │
│ Relatio- │ 需 ACID       │ 出生時空/命理基本   │ 複雜 JOIN / 唯一約束    │
│ nal      │ 強一致性      │ 財務/標籤/同意書    │ 交易需原子性            │
│          │ 外鍵關聯      │ 命盤索引(metadata) │                        │
│          │              │                  │                        │
├──────────┼──────────────┼──────────────────┼────────────────────────┤
│          │              │                  │                        │
│ ② 文件式  │ Schema 彈性   │ 訪問紀錄          │ 高頻寫入               │
│ Document │ 巢狀結構      │ 行為事件/對話原文   │ 按 ID + 時間範圍查      │
│          │ 各筆 payload  │ 行為畫像（聚合）   │ 不需跨文件 JOIN         │
│          │ 結構不同      │ ★命盤本體(多型態)  │ TTL 自動過期(部分)      │
│          │              │                  │                        │
├──────────┼──────────────┼──────────────────┼────────────────────────┤
│          │              │                  │                        │
│ ③ 鍵值/   │ 極低延遲      │ Session 狀態      │ 讀寫都要 < 1ms         │
│ 快取     │ 自動過期      │ 在線狀態          │ TTL 驅動生命週期        │
│ KV /     │ 臨時性       │ 短期對話記憶       │ 計數器 / Set / SortedSet│
│ Cache    │ 可丟失       │ Rate Limit        │ Pub/Sub 通知           │
│          │              │ DAU 統計          │                        │
│          │              │                  │                        │
├──────────┼──────────────┼──────────────────┼────────────────────────┤
│          │              │                  │                        │
│ ④ 時序    │ 時間為主軸    │ 互動頻率指標       │ 只追加、不修改          │
│ Time-    │ 只 append     │ 消費趨勢          │ 大量 aggregation       │
│ Series   │ 需降採樣      │ 情緒分數時間線     │ 自動降採樣 + 過期       │
│          │ 高壓縮比      │ 在線人數 gauge     │ 範圍查詢為主            │
│          │              │                  │                        │
├──────────┼──────────────┼──────────────────┼────────────────────────┤
│          │              │                  │                        │
│ ⑤ 向量    │ 語意相似度    │ 對話摘要 embedding │ 寫入: embed → upsert   │
│ Vector   │ 高維空間搜尋   │ 長期記憶 embedding │ 查詢: embed → ANN搜尋  │
│          │ 需 payload    │                  │ 需 filter by customer  │
│          │ 過濾         │                  │ Top-K + threshold      │
│          │              │                  │                        │
├──────────┼──────────────┼──────────────────┼────────────────────────┤
│          │              │                  │                        │
│ ⑥ 圖     │ 實體+關係     │ 人物關係網         │ 圖遍歷 (N 度)          │
│ Graph    │ N 度連結查詢   │ 事件/主題共現圖譜   │ 模式匹配               │
│          │ 動態權重      │ ★命盤星體/宮位關聯  │ 連結強度計算            │
│          │ 需圖演算法    │ ★五行↔水晶↔主題   │ 路徑分析 / 社群偵測     │
│          │              │                  │                        │
└──────────┴──────────────┴──────────────────┴────────────────────────┘
```

### 各型態的資料歸屬明細

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ① 關聯式 (Relational)                                              │
│  ────────────────────                                               │
│  customer               核心身份 + 命理基本資訊                      │
│                          （出生時空、星座、生肖、五行、職業、產業）    │
│  ★ customer_contact      人際圈（老公/老婆/小孩/父母/朋友...）       │
│                          （各自的出生資料 + 命理衍生欄位）            │
│  customer_address        寄送地址（1:N，購物車需要）                  │
│  tag + customer_tag      標籤系統（M:N，back-office 分群）           │
│  finance_record          財務交易（ACID，精確 DECIMAL）              │
│  customer_consent        隱私同意紀錄（法遵審計）                     │
│  customer_note           客服備註（可 pin、可分類）                   │
│  customer_birth_chart    命盤索引（指向 self 或 contact + Document）  │
│                                                                     │
│  ② 文件式 (Document)                                                │
│  ──────────────────                                                 │
│  visit_logs              各服務的訪問紀錄（高寫入、payload 不固定）    │
│  activity_events         前端 UI 行為事件（批次寫入）                 │
│  customer_behavior_profile  聚合行為畫像（巢狀 JSON、定期更新）       │
│  ★ divination_charts     命盤本體（占星/八字/紫微/合盤...多型態）      │
│  conversation_raw        對話原文保留（大文件、TTL 3 年）             │
│                                                                     │
│  ③ 鍵值/快取 (KV / Cache)                                           │
│  ────────────────────────                                           │
│  session:{id}            Session 狀態（滑動 TTL 30min）              │
│  presence:{customer_id}  在線狀態（TTL 5min heartbeat）              │
│  customer:sessions:{id}  多裝置 session 索引                         │
│  customer:online         在線排行（Sorted Set）                      │
│  customer:daily_active   DAU（HyperLogLog 計數）                     │
│  ratelimit:{id}:{action} 頻率限制（計數器 + TTL）                    │
│  conversation:working:{id} 短期對話記憶（當前 context window）       │
│                                                                     │
│  ④ 時序 (Time-Series)                                               │
│  ───────────────────                                                │
│  customer_engagement     互動事件頻率（按 service/channel/action）    │
│  customer_spending       消費金額趨勢（按 category/payment）         │
│  customer_sentiment      情緒分數時間線（-1.0 ~ 1.0）               │
│  system_session_gauge    系統同時在線數（每分鐘採集）                  │
│                                                                     │
│  ⑤ 向量 (Vector)                                                    │
│  ───────────────                                                    │
│  conversation_summaries  單次 session 對話摘要 embedding              │
│                          + metadata（情緒、人物、主題）               │
│  long_term_memory        跨 session 聚合的長期記憶 embedding          │
│                          + metadata（主題軌跡、來源追溯）             │
│                                                                     │
│  ⑥ 圖 (Graph)                                                       │
│  ────────────                                                       │
│  Nodes: Customer / Person(★可連結contact) / Event / Topic /          │
│         TarotCard / ReadingSession / Crystal / Emotion /            │
│         ★ CelestialBody / ZodiacSign / BaziElement /                │
│         ★ DivinationChart / ZiweiStar / Palace                      │
│  Edges: KNOWS / INTERESTED_IN / FEELS / HAD_READING /              │
│         DREW / INVOLVED_IN / EXPERIENCED / CORRELATES_WITH /       │
│         PURCHASED / RECOMMENDED / ASSOCIATED_WITH /                │
│         ★ HAS_CHART(Customer↔Chart & Person↔Chart) /               │
│         ★ SYNASTRY_WITH / PLANET_IN_SIGN / ASPECTED_BY /           │
│         ★ DAY_MASTER_IS / PALACE_CONTAINS / ELEMENT_MATCHES        │
│  每條 edge 帶 strength (0~1) + 時間衰減                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 型態間的資料流動關係

```
                    ┌──────────────┐
                    │ 客戶進行對話  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────────────┐
              ▼            ▼                    ▼
         ③ KV/Cache    ② Document          ④ Time-Series
         (即時狀態)     (原文保存)           (指標寫入)
         session TTL   conversation_raw     engagement++
         working memory visit_logs          sentiment score
              │            │
              │      ┌─────┴──────┐
              │      ▼            ▼
              │  ⑤ Vector     ⑥ Graph
              │  (摘要→embed)  (實體抽取→關係)
              │  summary       Person/Event/Topic
              │  long_term     strength 計算
              │      │            │
              │      └─────┬──────┘
              │            ▼
              │     ② Document
              │     (行為畫像聚合)
              │     behavior_profile
              │            │
              └────────────┤
                           ▼
                    ① Relational
                    (profile 更新 last_active、loyalty_points)
                    (排程: 會員升降級、dormant 標記)
```

---

## 儲存架構總覽

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CustomerManagement Service                            │
│                                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐          │
│  │  REST API    │  │ Event        │  │ gRPC     │  │ Scheduler   │          │
│  │  :3010       │  │ Consumer     │  │ ← DAL    │  │ (cron jobs) │          │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └──────┬──────┘          │
│         │                 │               │                │                 │
│         ▼                 ▼               ▼                ▼                 │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                          DAL (gRPC :4000)                             │   │
│  └──┬──────────┬───────────┬───────────┬───────────┬───────────┬────────┘   │
│     │          │           │           │           │           │             │
│     ▼          ▼           ▼           ▼           ▼           ▼             │
│  ┌────────┐┌────────┐┌─────────┐┌──────────┐┌──────────┐┌──────────┐       │
│  │Postgre ││MongoDB ││ Redis   ││InfluxDB  ││Qdrant    ││Neo4j     │       │
│  │SQL     ││        ││         ││          ││(Vector)  ││(Graph)   │       │
│  │        ││        ││         ││          ││          ││          │       │
│  │•profile││•visits ││•sessions││•engage-  ││•對話摘要  ││•人物關係  │       │
│  │•finance││•activity││•presence││ ment     ││•語意搜尋  ││•事件關聯  │       │
│  │•tags   ││•behavior││•rate-   ││•spending ││•長期記憶  ││•主題圖譜  │       │
│  │•consent││•events  ││ limit   ││•sentiment││•RAG 檢索  ││•連結強度  │       │
│  └────────┘└────────┘└─────────┘└──────────┘└──────────┘└──────────┘       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. ① 關聯式 — `customer_db`（核心 Profile & 關聯資料）

> 所有需要 ACID、外鍵約束、跨表 JOIN 的結構化資料
> 技術候選：PostgreSQL / MySQL / CockroachDB — TBD

### 1.1 `customer` — 核心客戶表

```sql
CREATE TABLE customer (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 身份識別（多管道登入）
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(50),
    line_id         VARCHAR(100) UNIQUE,        -- LINE 登入
    google_id       VARCHAR(100) UNIQUE,        -- Google OAuth
    apple_id        VARCHAR(100) UNIQUE,        -- Apple Sign-In

    -- 基本資料
    display_name    VARCHAR(100) NOT NULL,
    real_name       VARCHAR(100),
    avatar_url      TEXT,
    gender          VARCHAR(20),                -- male/female/non-binary/prefer_not_to_say
    locale          VARCHAR(10) DEFAULT 'zh-TW',
    timezone        VARCHAR(50) DEFAULT 'Asia/Taipei',

    -- ★ 命理必要資訊（出生時空）
    date_of_birth   DATE,                       -- 國曆生日
    time_of_birth   TIME,                       -- 出生時辰（精確到分，排命盤用）
    birth_city      VARCHAR(100),               -- 出生城市（占星需要經緯度）
    birth_country   VARCHAR(50),                -- 出生國家
    birth_lat       DECIMAL(9,6),               -- 出生地緯度（自動由 city 解析或手填）
    birth_lng       DECIMAL(9,6),               -- 出生地經度
    lunar_birthday  VARCHAR(20),                -- 農曆生日（格式: "甲子年臘月十五"）
    is_lunar_leap   BOOLEAN DEFAULT false,      -- 是否閏月出生

    -- ★ 命理衍生欄位（由系統自動計算，可被覆寫）
    zodiac_sign     VARCHAR(20),                -- 西洋星座 Aries/Taurus/...（由 DOB 計算）
    chinese_zodiac  VARCHAR(10),                -- 生肖 鼠/牛/虎/...（由農曆年計算）
    element_wuxing  VARCHAR(10),                -- 五行屬性 金/木/水/火/土（由八字計算）
    bazi_day_master VARCHAR(10),                -- 八字日主 甲/乙/丙/.../癸（由出生時間計算）
    life_path_number INTEGER,                   -- 生命靈數 1-9, 11, 22, 33（由 DOB 計算）
    blood_type      VARCHAR(5),                 -- 血型 A/B/O/AB（部分命理系統使用）

    -- ★ 個人背景（命理諮詢常需要的 context）
    occupation      VARCHAR(100),               -- 職業
    industry        VARCHAR(100),               -- 產業
    company_name    VARCHAR(200),               -- 公司名稱（紫微/姓名學可能用到）
    education_level VARCHAR(50),                -- 學歷 high_school/bachelor/master/phd/other
    marital_status  VARCHAR(30),                -- single/in_relationship/married/divorced/widowed
    has_children    BOOLEAN,
    children_count  SMALLINT,

    -- 會員系統
    membership_tier VARCHAR(20) DEFAULT 'free', -- free / silver / gold / vip
    tier_expires_at TIMESTAMPTZ,
    loyalty_points  INTEGER DEFAULT 0,
    referral_code   VARCHAR(20) UNIQUE,
    referred_by     UUID REFERENCES customer(id),

    -- 狀態
    status          VARCHAR(20) DEFAULT 'active', -- active / suspended / deleted / dormant
    last_active_at  TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,                  -- soft delete

    -- 偏好（結構化的偏好存 column，彈性偏好存 JSONB）
    preferred_reading_style  VARCHAR(50),   -- classic / modern / spiritual / psychological
    preferred_spread         VARCHAR(50),   -- celtic_cross / three_card / single / horseshoe
    preferred_divination     JSONB DEFAULT '["tarot"]',  -- ["tarot","astrology","bazi","ziwei","numerology"]
    notification_channels    JSONB DEFAULT '["push"]',   -- ["push","email","line","sms"]

    -- 彈性欄位
    metadata        JSONB DEFAULT '{}',

    -- 時間戳
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_customer_email ON customer(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customer_phone ON customer(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customer_line_id ON customer(line_id) WHERE line_id IS NOT NULL;
CREATE INDEX idx_customer_status ON customer(status);
CREATE INDEX idx_customer_membership ON customer(membership_tier);
CREATE INDEX idx_customer_last_active ON customer(last_active_at);
CREATE INDEX idx_customer_created ON customer(created_at);
CREATE INDEX idx_customer_referral ON customer(referral_code);
CREATE INDEX idx_customer_zodiac ON customer(zodiac_sign);
CREATE INDEX idx_customer_chinese_zodiac ON customer(chinese_zodiac);
CREATE INDEX idx_customer_occupation ON customer(occupation) WHERE occupation IS NOT NULL;
CREATE INDEX idx_customer_industry ON customer(industry) WHERE industry IS NOT NULL;
```

### 1.2 `customer_address` — 寄送地址（購物車需要）

```sql
CREATE TABLE customer_address (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    label           VARCHAR(50) DEFAULT 'home',  -- home / office / other
    recipient_name  VARCHAR(100),
    phone           VARCHAR(50),
    postal_code     VARCHAR(10),
    city            VARCHAR(50),
    district        VARCHAR(50),
    address_line1   VARCHAR(255) NOT NULL,
    address_line2   VARCHAR(255),
    is_default      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_address_customer ON customer_address(customer_id);
```

### 1.3 `customer_tag` — 標籤系統（back-office 分群用）

```sql
CREATE TABLE tag (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL,   -- vip_candidate / tarot_enthusiast / crystal_lover
    category        VARCHAR(50),                    -- behavior / interest / demographic / system
    color           VARCHAR(7),                     -- #FF5733 (UI display)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_tag (
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    applied_by      VARCHAR(100) DEFAULT 'system',  -- staff name or 'system'/'ai'
    applied_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (customer_id, tag_id)
);

CREATE INDEX idx_customer_tag_customer ON customer_tag(customer_id);
CREATE INDEX idx_customer_tag_tag ON customer_tag(tag_id);
```

### 1.4 `finance_record` — 財務紀錄

```sql
CREATE TABLE finance_record (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customer(id),
    type            VARCHAR(20) NOT NULL,   -- purchase / refund / topup / subscription / gift
    amount          DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'TWD',
    source_service  VARCHAR(50),            -- shopping-cart / tarotist-scheduler
    source_ref_id   VARCHAR(100),           -- order_id / appointment_id
    payment_method  VARCHAR(50),            -- credit_card / line_pay / apple_pay / bank_transfer
    status          VARCHAR(20) DEFAULT 'completed', -- pending / completed / failed / refunded
    description     TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_finance_customer ON finance_record(customer_id);
CREATE INDEX idx_finance_type ON finance_record(type);
CREATE INDEX idx_finance_created ON finance_record(created_at);
CREATE INDEX idx_finance_source ON finance_record(source_service, source_ref_id);
```

### 1.5 `customer_consent` — 隱私同意紀錄（GDPR / 個資法）

```sql
CREATE TABLE customer_consent (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    consent_type    VARCHAR(50) NOT NULL,   -- marketing_email / data_analytics / third_party_sharing / push_notification
    granted         BOOLEAN NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    granted_at      TIMESTAMPTZ DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_consent_customer ON customer_consent(customer_id);
CREATE INDEX idx_consent_type ON customer_consent(customer_id, consent_type);
```

### 1.6 `customer_note` — 客服備註

```sql
CREATE TABLE customer_note (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    author          VARCHAR(100) NOT NULL,   -- staff name / 'system' / 'ai-caring'
    category        VARCHAR(50),             -- general / complaint / preference / risk_flag
    content         TEXT NOT NULL,
    is_pinned       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_note_customer ON customer_note(customer_id);
CREATE INDEX idx_note_category ON customer_note(customer_id, category);
```

### 1.7 `customer_contact` — 客戶的人際圈（分支人物）

> 客戶會幫老公、老婆、小孩、父母、朋友排命盤，
> 這些人不是系統的註冊用戶，但需要保存他們的出生資料作為命盤輸入。
> 獨立成一張表，避免每次排盤都重複填寫，同時可追蹤同一個人的多個命盤。

```sql
CREATE TABLE customer_contact (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,

    -- 基本資訊
    nickname        VARCHAR(100) NOT NULL,       -- 客戶自訂暱稱（"老公"/"大寶"/"媽媽"）
    real_name       VARCHAR(100),                -- 真名（選填）
    relationship    VARCHAR(30) NOT NULL,        -- spouse / child / parent / sibling / partner
                                                 -- friend / colleague / boss / client / ex / other
    gender          VARCHAR(20),

    -- ★ 命理必要資訊（跟 customer 表同欄位結構）
    date_of_birth   DATE,
    time_of_birth   TIME,                        -- 出生時辰
    birth_city      VARCHAR(100),
    birth_country   VARCHAR(50),
    birth_lat       DECIMAL(9,6),
    birth_lng       DECIMAL(9,6),
    lunar_birthday  VARCHAR(20),
    is_lunar_leap   BOOLEAN DEFAULT false,

    -- 命理衍生欄位（系統自動計算）
    zodiac_sign     VARCHAR(20),
    chinese_zodiac  VARCHAR(10),
    element_wuxing  VARCHAR(10),
    bazi_day_master VARCHAR(10),
    blood_type      VARCHAR(5),

    -- 背景（選填，輔助命理分析）
    occupation      VARCHAR(100),
    industry        VARCHAR(100),
    marital_status  VARCHAR(30),

    -- 備註
    notes           TEXT,                        -- 客戶對此人的補充描述

    -- 管理
    status          VARCHAR(20) DEFAULT 'active', -- active / archived
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_customer ON customer_contact(customer_id);
CREATE INDEX idx_contact_relationship ON customer_contact(customer_id, relationship);
```

### 1.8 `customer_birth_chart` — 命盤索引表（關聯式 metadata，命盤本體在 Document）

> 一個客戶可擁有多種命盤。命盤的「主角」可以是客戶本人，也可以是 `customer_contact` 中的人。
> 合盤則會關聯兩個主角（自己+對方）。

```sql
CREATE TABLE customer_birth_chart (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,

    -- 命盤類型
    chart_type      VARCHAR(30) NOT NULL,        -- astrology / bazi / ziwei / numerology / human_design
    chart_subtype   VARCHAR(30),                 -- natal / transit / synastry / composite / solar_return / progression
    label           VARCHAR(100),                -- 自訂標籤（"我的本命盤" / "跟老公的合盤"）

    -- ★ 命盤主角：指向 customer（自己）或 customer_contact（別人）
    subject_type    VARCHAR(10) NOT NULL DEFAULT 'self',  -- self / contact
    subject_contact_id UUID REFERENCES customer_contact(id) ON DELETE SET NULL,
        -- subject_type='self'    → subject_contact_id = NULL（主角是客戶本人）
        -- subject_type='contact' → subject_contact_id = 某 contact（主角是家人/朋友）

    -- ★ 合盤的第二主角（synastry / composite 時使用）
    partner_type    VARCHAR(10),                 -- self / contact（合盤對象）
    partner_contact_id UUID REFERENCES customer_contact(id) ON DELETE SET NULL,

    -- 命盤文件引用（本體存在 ② 文件式）
    document_ref_id VARCHAR(100) NOT NULL,        -- → divination_charts._id

    -- 狀態
    is_primary      BOOLEAN DEFAULT false,        -- 是否為該主角的主要命盤
    status          VARCHAR(20) DEFAULT 'active', -- active / archived / draft
    computed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_birth_chart_customer ON customer_birth_chart(customer_id);
CREATE INDEX idx_birth_chart_type ON customer_birth_chart(customer_id, chart_type);
CREATE INDEX idx_birth_chart_subject ON customer_birth_chart(subject_contact_id) WHERE subject_contact_id IS NOT NULL;
CREATE INDEX idx_birth_chart_primary ON customer_birth_chart(customer_id, subject_type) WHERE is_primary = true;
CREATE INDEX idx_birth_chart_doc_ref ON customer_birth_chart(document_ref_id);
```

### 資料關係圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  customer (客戶本人)                                                │
│  ┌──────────────────┐                                               │
│  │ id: uuid-小美     │                                               │
│  │ display_name: 小美│                                               │
│  │ date_of_birth    │──┐                                            │
│  │ time_of_birth    │  │                                            │
│  │ zodiac: Gemini   │  │  subject_type = 'self'                     │
│  └──────────────────┘  │                                            │
│         │1:N            ▼                                            │
│         │      customer_birth_chart ──→ divination_charts (Document) │
│         │      ┌───────────────────────┐   ┌──────────────────────┐ │
│         │      │ "我的占星本命盤"        │──→│ planets, houses,     │ │
│         │      │ type=astrology/natal   │   │ aspects ...          │ │
│         │      │ subject_type=self      │   └──────────────────────┘ │
│         │      ├───────────────────────┤   ┌──────────────────────┐ │
│         │      │ "我的八字"             │──→│ four_pillars,        │ │
│         │      │ type=bazi/natal        │   │ ten_gods, luck ...   │ │
│         │      │ subject_type=self      │   └──────────────────────┘ │
│         │      ├───────────────────────┤   ┌──────────────────────┐ │
│         │      │ "老公的本命盤"          │──→│ planets, houses ...  │ │
│         │      │ type=astrology/natal   │   └──────────────────────┘ │
│         │      │ subject_type=contact ──┤                            │
│         │      │ subject_contact_id ────┼──→ customer_contact        │
│         │      ├───────────────────────┤   ┌──────────────────────┐ │
│         │      │ "大寶的紫微"            │──→│ palaces, stars ...   │ │
│         │      │ type=ziwei/natal       │   └──────────────────────┘ │
│         │      │ subject_type=contact ──┼──→ customer_contact        │
│         │      ├───────────────────────┤   ┌──────────────────────┐ │
│         │      │ "我和老公合盤"          │──→│ cross_aspects,       │ │
│         │      │ type=astrology/synastry│   │ compatibility ...    │ │
│         │      │ subject_type=self      │   └──────────────────────┘ │
│         │      │ partner_type=contact ──┼──→ customer_contact        │
│         │      └───────────────────────┘                             │
│         │                                                            │
│         ▼ 1:N                                                        │
│  customer_contact (人際圈)                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ nickname: 老公    │  │ nickname: 大寶    │  │ nickname: 媽媽    │  │
│  │ relation: spouse │  │ relation: child  │  │ relation: parent │  │
│  │ date_of_birth    │  │ date_of_birth    │  │ date_of_birth    │  │
│  │ time_of_birth    │  │ time_of_birth    │  │ (不確定出生時辰)  │  │
│  │ zodiac: Leo      │  │ zodiac: Pisces   │  │ zodiac: Scorpio  │  │
│  └──────────────────┘  └──────────────────┘  └───────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. ② 文件式 — `customer_activity_db`（訪問歷史 & 行為活動）

> 半結構化、高寫入、彈性 schema。每種活動的 payload 欄位都不同，適合 document model。
> 技術候選：MongoDB / DynamoDB / Couchbase — TBD

### 2.1 `visit_logs` Collection — 訪問紀錄

```jsonc
// Collection: visit_logs
// 寫入頻率: 高（每次 API call / 頁面瀏覽）
// 查詢模式: 按 customer_id + 時間範圍、按 service 聚合
{
  "_id": ObjectId,
  "customer_id": "uuid-string",           // 關聯 PG customer.id
  "session_id": "uuid-string",            // 關聯 Redis session
  "service": "tarot-reading",             // tarot-reading / shopping-cart / caring / scheduler
  "action": "reading.started",            // 動作標識（hierarchical dot notation）
  "channel": "web",                       // web / mobile / line / api
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "geo": {
    "country": "TW",
    "city": "Taipei",
    "lat": 25.033,
    "lng": 121.565
  },
  "ref_id": "reading-uuid",              // 來源實體 ID（reading_id / order_id）
  "payload": {                            // 各 action 自定義內容
    "spread_type": "celtic_cross",
    "question_category": "love"
  },
  "duration_ms": 45000,                  // 停留時間
  "created_at": ISODate("2025-01-15T08:30:00Z")
}

// 索引
// { customer_id: 1, created_at: -1 }          — 客戶歷史查詢
// { service: 1, action: 1, created_at: -1 }   — 服務活動分析
// { session_id: 1 }                            — Session 回溯
// TTL index: { created_at: 1 }, expireAfterSeconds: 63072000  — 2年自動過期
```

### 2.2 `activity_events` Collection — 行為事件流

```jsonc
// Collection: activity_events
// 用途: 追蹤更細粒度的使用者行為（前端事件、UI 互動）
// 寫入: 批次寫入（前端累積後批次送出）
{
  "_id": ObjectId,
  "customer_id": "uuid-string",
  "session_id": "uuid-string",
  "event_type": "ui.interaction",         // ui.interaction / feature.usage / search / navigation
  "event_name": "card_flipped",           // 具體事件名稱
  "page": "/reading/celtic-cross",
  "component": "TarotCard",
  "properties": {                         // 事件自定義屬性
    "card_index": 3,
    "card_name": "The Tower",
    "flip_duration_ms": 800,
    "is_reversed": true
  },
  "context": {                            // 裝置/環境上下文
    "device_type": "mobile",
    "os": "iOS 17",
    "app_version": "2.1.0",
    "screen_width": 390,
    "screen_height": 844
  },
  "created_at": ISODate("2025-01-15T08:30:15.123Z")
}

// 索引
// { customer_id: 1, event_type: 1, created_at: -1 }
// { event_name: 1, created_at: -1 }            — 事件分析
// TTL index: { created_at: 1 }, expireAfterSeconds: 15552000  — 180天過期
```

### 2.3 `customer_behavior_profile` Collection — 行為畫像（聚合結果）

```jsonc
// Collection: customer_behavior_profile
// 用途: 由排程任務定期聚合產生，供 CaringService / 推薦系統讀取
// 更新頻率: 每日 or 觸發式
{
  "_id": "customer-uuid",                // 直接使用 customer_id 作為 _id
  "computed_at": ISODate("2025-01-15T04:00:00Z"),

  "reading_profile": {
    "total_readings": 87,
    "favorite_spreads": ["celtic_cross", "three_card"],
    "favorite_categories": ["love", "career"],
    "avg_reading_duration_sec": 320,
    "most_drawn_cards": [
      { "card": "The Moon", "count": 12 },
      { "card": "The Star", "count": 9 }
    ],
    "reversed_card_ratio": 0.35,
    "last_reading_at": ISODate("2025-01-14T20:00:00Z"),
    "reading_frequency": {               // 最近各期間的頻率
      "last_7d": 3,
      "last_30d": 8,
      "last_90d": 22
    }
  },

  "shopping_profile": {
    "total_orders": 12,
    "total_spent": 15800.00,
    "avg_order_value": 1316.67,
    "favorite_categories": ["crystals", "tarot_decks"],
    "last_purchase_at": ISODate("2025-01-10T15:00:00Z"),
    "purchase_frequency": {
      "last_30d": 2,
      "last_90d": 5
    }
  },

  "engagement_profile": {
    "engagement_score": 78,              // 0-100 綜合活躍度
    "churn_risk": "low",                 // low / medium / high / critical
    "lifecycle_stage": "active",         // new / onboarding / active / declining / dormant / churned
    "preferred_active_hours": [20, 21, 22],  // 最常上線的小時
    "preferred_days": ["sat", "sun"],
    "avg_session_duration_sec": 480,
    "sessions_per_week": 4.2
  },

  "caring_signals": {                    // 供 CaringService 使用
    "sentiment_trend": "stable",         // improving / stable / declining
    "needs_attention": false,
    "last_negative_sentiment_at": null,
    "crisis_flag_count": 0,
    "suggested_actions": ["send_weekly_horoscope", "recommend_amethyst"]
  }
}

// 索引
// { "engagement_profile.churn_risk": 1 }
// { "engagement_profile.lifecycle_stage": 1 }
// { "caring_signals.needs_attention": 1 }
```

### 2.4 `divination_charts` Collection — 命盤本體（多型態）

> 命盤結構因類型而異（占星 vs 八字 vs 紫微 vs 靈數 vs 人類圖...），
> 用 Document 存放可以讓每種命盤有完全不同的 schema，且支援巢狀結構。
> 關聯式 `customer_birth_chart` 表只存 metadata（可 JOIN），本體存這裡。

```jsonc
// Collection: divination_charts
// 寫入頻率: 低（排盤時寫入一次，偶爾重算）
// 查詢模式: 按 _id 直接取、按 customer_id + chart_type 篩選
// 不設 TTL — 命盤是永久資料

// ════════════════════════════════════════
// 範例 A：西洋占星本命盤 (Natal Chart)
// ════════════════════════════════════════
{
  "_id": "chart-uuid-astro-001",
  "customer_id": "uuid",
  "chart_type": "astrology",
  "chart_subtype": "natal",
  "version": 1,                              // 重算時 version++

  "birth_data": {                            // 排盤輸入（冗餘存放，命盤自包含）
    "datetime_utc": "1990-06-15T08:30:00Z",
    "timezone": "Asia/Taipei",
    "city": "台北",
    "lat": 25.033,
    "lng": 121.565
  },

  "planets": [
    { "name": "Sun",     "sign": "Gemini",     "degree": 24.15, "house": 10, "retrograde": false },
    { "name": "Moon",    "sign": "Scorpio",     "degree": 12.80, "house": 3,  "retrograde": false },
    { "name": "Mercury", "sign": "Cancer",      "degree": 2.45,  "house": 11, "retrograde": false },
    { "name": "Venus",   "sign": "Taurus",      "degree": 28.30, "house": 9,  "retrograde": false },
    { "name": "Mars",    "sign": "Aries",       "degree": 15.62, "house": 8,  "retrograde": false },
    { "name": "Jupiter", "sign": "Cancer",      "degree": 5.90,  "house": 11, "retrograde": false },
    { "name": "Saturn",  "sign": "Capricorn",   "degree": 22.10, "house": 5,  "retrograde": true },
    { "name": "Uranus",  "sign": "Capricorn",   "degree": 8.75,  "house": 5,  "retrograde": true },
    { "name": "Neptune", "sign": "Capricorn",   "degree": 14.20, "house": 5,  "retrograde": true },
    { "name": "Pluto",   "sign": "Scorpio",     "degree": 16.50, "house": 3,  "retrograde": true },
    { "name": "NorthNode","sign": "Aquarius",   "degree": 4.30,  "house": 6,  "retrograde": true }
  ],

  "houses": [
    { "house": 1,  "sign": "Virgo",      "degree": 18.50 },
    { "house": 2,  "sign": "Libra",      "degree": 14.20 },
    { "house": 3,  "sign": "Scorpio",    "degree": 12.80 },
    // ... houses 4-12
  ],

  "aspects": [
    { "planet1": "Sun",  "planet2": "Moon",    "type": "quincunx", "orb": 1.35, "applying": false },
    { "planet1": "Sun",  "planet2": "Saturn",  "type": "opposition","orb": 2.05, "applying": true },
    { "planet1": "Moon", "planet2": "Pluto",   "type": "conjunction","orb": 3.70, "applying": false },
    { "planet1": "Venus","planet2": "Jupiter", "type": "sextile",   "orb": 2.40, "applying": true },
    // ...
  ],

  "calculated_at": "2025-01-15T10:00:00Z",
  "engine": "swiss_ephemeris",               // 計算引擎
  "engine_version": "2.10",
  "house_system": "placidus"                 // placidus / whole_sign / equal / koch
}

// ════════════════════════════════════════
// 範例 B：八字命盤
// ════════════════════════════════════════
{
  "_id": "chart-uuid-bazi-001",
  "customer_id": "uuid",
  "chart_type": "bazi",
  "chart_subtype": "natal",
  "version": 1,

  "birth_data": {
    "datetime_local": "1990-06-15T08:30:00",
    "timezone": "Asia/Taipei",
    "calendar": "lunar",
    "lunar_date": "庚午年五月廿三日辰時"
  },

  "four_pillars": {                          // 四柱
    "year":  { "stem": "庚", "branch": "午", "element": "金", "animal": "馬", "nayin": "路旁土" },
    "month": { "stem": "壬", "branch": "午", "element": "水", "animal": "馬", "nayin": "楊柳木" },
    "day":   { "stem": "甲", "branch": "午", "element": "木", "animal": "馬", "nayin": "沙中金" },
    "hour":  { "stem": "戊", "branch": "辰", "element": "土", "animal": "龍", "nayin": "大林木" }
  },

  "day_master": {                            // 日主分析
    "stem": "甲",
    "element": "木",
    "strength": "moderate",                  // strong / moderate / weak
    "favorable_elements": ["水", "木"],
    "unfavorable_elements": ["金", "火"]
  },

  "ten_gods": {                              // 十神
    "year_stem":  "偏財",
    "year_branch": "傷官",
    "month_stem": "偏印",
    "month_branch":"傷官",
    "day_branch":  "傷官",
    "hour_stem":  "偏財",
    "hour_branch": "正財"
  },

  "luck_pillars": [                          // 大運
    { "start_age": 3,  "end_age": 12, "stem": "辛", "branch": "未", "element": "金土" },
    { "start_age": 13, "end_age": 22, "stem": "庚", "branch": "午", "element": "金火" },
    { "start_age": 23, "end_age": 32, "stem": "己", "branch": "巳", "element": "土火" },
    { "start_age": 33, "end_age": 42, "stem": "戊", "branch": "辰", "element": "土土" },
    // ...
  ],

  "special_patterns": ["傷官見官", "食神制殺"],  // 特殊格局
  "calculated_at": "2025-01-15T10:00:00Z",
  "engine": "bazi-calc",
  "engine_version": "1.5"
}

// ════════════════════════════════════════
// 範例 C：紫微斗數命盤
// ════════════════════════════════════════
{
  "_id": "chart-uuid-ziwei-001",
  "customer_id": "uuid",
  "chart_type": "ziwei",
  "chart_subtype": "natal",
  "version": 1,

  "birth_data": {
    "datetime_local": "1990-06-15T08:30:00",
    "timezone": "Asia/Taipei",
    "lunar_date": "庚午年五月廿三日辰時",
    "gender": "female"                       // 紫微斗數陰陽順逆需要性別
  },

  "palaces": [                               // 十二宮
    {
      "palace": "命宮",
      "position": "午",
      "main_stars": ["天同", "天梁"],
      "minor_stars": ["左輔", "天魁"],
      "four_transformations": ["天同化祿"],
      "brightness": "廟"                     // 廟/旺/得/利/平/不/陷
    },
    {
      "palace": "兄弟宮",
      "position": "未",
      "main_stars": ["武曲", "天府"],
      "minor_stars": ["文曲"],
      "four_transformations": [],
      "brightness": "旺"
    },
    // ... 12 palaces total
  ],

  "ming_master": "天同",                      // 命宮主星
  "shen_master": "紫微",                      // 身宮主星
  "shen_palace": "官祿宮",                    // 身宮位置
  "five_elements_bureau": "土五局",            // 五行局
  "calculated_at": "2025-01-15T10:00:00Z",
  "engine": "ziwei-calc",
  "engine_version": "2.0"
}

// ════════════════════════════════════════
// 範例 D：合盤 / 配對盤 (Synastry)
// ════════════════════════════════════════
{
  "_id": "chart-uuid-synastry-001",
  "customer_id": "uuid",
  "chart_type": "astrology",
  "chart_subtype": "synastry",
  "version": 1,

  "person_a": {
    "name": "小美",
    "source_chart_id": "chart-uuid-astro-001",  // 引用本命盤
    "birth_data": { /* ... */ }
  },
  "person_b": {
    "name": "小明",
    "source_chart_id": "chart-uuid-astro-002",
    "birth_data": { /* ... */ }
  },

  "cross_aspects": [
    { "a_planet": "Sun",  "b_planet": "Moon",   "type": "trine",      "orb": 1.20 },
    { "a_planet": "Venus","b_planet": "Mars",   "type": "conjunction", "orb": 0.80 },
    { "a_planet": "Moon", "b_planet": "Saturn", "type": "square",      "orb": 2.50 },
    // ...
  ],

  "compatibility_scores": {
    "overall": 72,
    "emotional": 85,
    "intellectual": 68,
    "physical": 78,
    "spiritual": 60
  },

  "calculated_at": "2025-01-15T10:00:00Z",
  "engine": "swiss_ephemeris",
  "engine_version": "2.10"
}

// ════════════════════════════════════════
// 索引
// ════════════════════════════════════════
// { customer_id: 1, chart_type: 1 }
// { customer_id: 1, chart_subtype: 1, created_at: -1 }
// 不設 TTL — 命盤是永久資料
```

---

## 3. ③ 鍵值/快取 — Session & 在線狀態

> 低延遲讀寫、自動過期、即時查詢
> 技術候選：Redis / Valkey / Dragonfly / KeyDB — TBD

### 3.1 Session Store

```
┌──────────────────────────────────────────────────────────────┐
│ Key Pattern                                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ session:{session_id}                     TTL: 30 min (slide) │
│ ─────────────────────────────────────                         │
│ Hash:                                                         │
│   customer_id     → "uuid"                                    │
│   channel         → "web" | "mobile" | "line"                │
│   device_id       → "device-fingerprint"                      │
│   ip_address      → "203.0.113.42"                           │
│   started_at      → "2025-01-15T08:30:00Z"                   │
│   last_activity   → "2025-01-15T08:45:00Z"                   │
│   current_page    → "/reading/celtic-cross"                   │
│   reading_id      → "current-reading-uuid" (if in reading)   │
│   cart_id         → "cart-uuid" (if shopping)                 │
│   metadata        → "{...}" (JSON string)                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Presence（在線狀態）

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│ presence:{customer_id}                   TTL: 5 min          │
│ ─────────────────────                                         │
│ Hash:                                                         │
│   status          → "online" | "idle" | "in_reading"         │
│   session_id      → "current-session-uuid"                    │
│   channel         → "web"                                     │
│   last_heartbeat  → "2025-01-15T08:45:00Z"                   │
│                                                               │
│ 用途: CaringService 判斷是否即時推送                            │
│       TarotistScheduler 顯示在線塔羅師                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Customer 索引 & 查找

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│ customer:sessions:{customer_id}          TTL: none (managed) │
│ ──────────────────────────────                                │
│ Set: [session_id_1, session_id_2, ...]                       │
│ 用途: 查找某客戶的所有 active sessions（多裝置登入）             │
│                                                               │
│ customer:online                          TTL: none           │
│ ─────────────────                                             │
│ Sorted Set: { customer_id: last_heartbeat_timestamp }        │
│ 用途: 查詢目前在線人數、最近上線名單                             │
│                                                               │
│ customer:daily_active:{YYYY-MM-DD}       TTL: 7 days         │
│ ─────────────────────────────────                             │
│ HyperLogLog                                                   │
│ 用途: DAU 統計（不儲存具體 ID，僅計數）                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 Rate Limiting & Anti-abuse

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│ ratelimit:{customer_id}:{action}         TTL: window size    │
│ ──────────────────────────────────                            │
│ String (counter)                                              │
│                                                               │
│ 範例:                                                         │
│   ratelimit:uuid:reading       → 5   (TTL: 3600)  ← 1hr/5次 │
│   ratelimit:uuid:api_call      → 120 (TTL: 60)    ← 1min/120│
│   ratelimit:uuid:login_attempt → 3   (TTL: 900)   ← 15min/3 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. ④ 時序 — Time-Series 指標

> 高頻寫入、時間範圍聚合查詢、自動降採樣（downsampling）
> 技術候選：InfluxDB / TimescaleDB / QuestDB / ClickHouse — TBD

### 4.1 Measurement 設計

```
┌──────────────────────────────────────────────────────────────┐
│  Bucket: customer_metrics                                     │
│  Retention: 原始 90 天 → 降採樣 1 年 → 再降採樣 3 年           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Measurement: customer_engagement                             │
│  ─────────────────────────────                                │
│  Tags:                                                        │
│    customer_id   (string)        — 客戶 ID                    │
│    service       (string)        — tarot / shop / scheduler   │
│    channel       (string)        — web / mobile / line        │
│    action_type   (string)        — reading / purchase / visit │
│  Fields:                                                      │
│    event_count   (int)           — 事件次數                    │
│    duration_sec  (float)         — 持續時間                    │
│    value         (float)         — 金額或分數                  │
│  Timestamp: nanosecond precision                              │
│                                                               │
│  查詢範例:                                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ from(bucket: "customer_metrics")                         │ │
│  │   |> range(start: -30d)                                  │ │
│  │   |> filter(fn: (r) => r._measurement == "customer_      │ │
│  │       engagement" and r.customer_id == "uuid")           │ │
│  │   |> filter(fn: (r) => r.service == "tarot")             │ │
│  │   |> aggregateWindow(every: 1d, fn: sum)                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Measurement: customer_spending                               │
│  ──────────────────────────────                               │
│  Tags:                                                        │
│    customer_id   (string)                                     │
│    category      (string)        — crystals / tarot_decks ... │
│    payment_method(string)        — credit_card / line_pay ... │
│  Fields:                                                      │
│    amount        (float)         — 金額                       │
│    item_count    (int)           — 商品數量                    │
│  Timestamp: nanosecond precision                              │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Measurement: customer_sentiment                              │
│  ──────────────────────────────                               │
│  Tags:                                                        │
│    customer_id   (string)                                     │
│    service       (string)                                     │
│  Fields:                                                      │
│    score         (float)         — -1.0 ~ 1.0 情緒分數        │
│    category      (string)        — positive / neutral / neg   │
│  Timestamp: nanosecond precision                              │
│                                                               │
│  用途: CaringService 偵測情緒趨勢、觸發關懷流程                  │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Measurement: system_session_gauge                            │
│  ──────────────────────────────────                           │
│  Tags:                                                        │
│    channel       (string)                                     │
│    membership    (string)                                     │
│  Fields:                                                      │
│    active_sessions (int)         — 同時在線 session 數         │
│    unique_users    (int)         — 不重複使用者數               │
│  Timestamp: 每 1min 採集                                       │
│                                                               │
│  用途: Dashboard 即時監控、容量規劃                              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 降採樣策略（Downsampling）

```
┌─────────────────────────────────────────────────────────────┐
│  Tier          Granularity    Retention    Aggregation       │
│  ─────────────────────────────────────────────────────────── │
│  Raw           as-is          90 days      none              │
│  Hourly        1 hour         365 days     mean, sum, count  │
│  Daily         1 day          3 years      mean, sum, count  │
│                                            min, max          │
└─────────────────────────────────────────────────────────────┘

-- InfluxDB Task (自動降採樣)
option task = {name: "downsample_hourly", every: 1h}

from(bucket: "customer_metrics")
  |> range(start: -task.every)
  |> filter(fn: (r) => r._measurement == "customer_engagement")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "customer_metrics_hourly")
```

---

## 5. ⑤ 向量 — 對話記憶 & 語意檢索

> 客戶與 AI Tarot 的對話歷史，經摘要 + embedding 後存入 Vector DB，
> 實現「系統記得上次聊了什麼」以及「客戶問過往歷史時可語意反查」。
> 技術候選：Qdrant / Milvus / Weaviate / pgvector / Pinecone — TBD

### 5.1 設計理念：三層對話記憶架構

```
┌──────────────────────────────────────────────────────────────────┐
│                   Conversation Memory Pipeline                    │
│                                                                   │
│  即時對話                                                         │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Layer 1: Working Memory (Redis)                         │     │
│  │ • 當前 session 的對話 context window                      │     │
│  │ • 最近 N 輪對話原文（供 LLM 即時使用）                      │     │
│  │ • TTL = session 存活時間                                  │     │
│  └────────────────────────┬────────────────────────────────┘     │
│                           │ session 結束 / 每 K 輪觸發            │
│                           ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Layer 2: Summary Memory (Qdrant + MongoDB)              │     │
│  │ • LLM 生成對話摘要（summary）                              │     │
│  │ • 摘要文字 → embedding → Qdrant 向量索引                   │     │
│  │ • 摘要原文 + metadata → MongoDB 文件儲存                   │     │
│  │ • 用途：跨 session 回憶、語意搜尋                          │     │
│  └────────────────────────┬────────────────────────────────┘     │
│                           │ 定期聚合（每週/每月）                   │
│                           ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Layer 3: Long-term Memory (Qdrant + MongoDB)            │     │
│  │ • 跨 session 的長期主題摘要                                │     │
│  │ • 客戶長期關注議題、反覆出現的人物/事件                      │     │
│  │ • 用途：深度個人化、CaringService 長期追蹤                  │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Qdrant Collection: `conversation_summaries`

```jsonc
// Collection: conversation_summaries
// Vector size: 1536 (OpenAI text-embedding-3-small) 或 3072 (text-embedding-3-large)
// Distance: Cosine

// --- Point (一筆向量紀錄) ---
{
  "id": "uuid",                            // point ID
  "vector": [0.023, -0.041, ...],          // embedding of summary_text
  "payload": {
    "customer_id": "uuid",
    "session_id": "uuid",
    "reading_id": "uuid",                  // 關聯的塔羅解讀 ID（如適用）

    // 摘要內容
    "summary_text": "客戶詢問感情問題，與男友小明交往兩年近期常吵架，抽到塔牌正位與月亮逆位，解讀建議面對衝突而非逃避，客戶表示會嘗試溝通。",
    "summary_type": "session",             // session（單次摘要）/ weekly / monthly / topic
    "language": "zh-TW",

    // 解讀相關
    "spread_type": "celtic_cross",
    "cards_drawn": ["The Tower", "The Moon (R)", "The Star"],
    "question_category": "love",           // love / career / health / finance / spiritual / general

    // 情緒 & 語意標籤
    "sentiment_score": -0.3,               // -1.0 ~ 1.0
    "emotion_tags": ["anxious", "hopeful"],
    "key_topics": ["relationship", "communication", "conflict"],
    "mentioned_people": ["小明"],
    "mentioned_events": ["吵架", "冷戰"],

    // 時間
    "conversation_at": "2025-01-15T20:30:00Z",
    "turn_count": 12,                      // 對話來回次數
    "duration_sec": 480,

    // 記憶管理
    "memory_layer": "session",             // session / long_term
    "importance_score": 0.7,               // 0-1，重要度（影響保留優先序）
    "access_count": 3,                     // 被回溯查詢的次數
    "last_accessed_at": "2025-01-20T10:00:00Z",
    "expires_at": null                     // null = 永不過期; long_term 記憶不過期
  }
}
```

### 5.3 Qdrant Collection: `long_term_memory`

```jsonc
// Collection: long_term_memory
// 用途：跨 session 聚合的長期記憶片段，比 conversation_summaries 更濃縮
// 由排程任務定期從多個 session summaries 聚合產生

{
  "id": "uuid",
  "vector": [0.012, -0.055, ...],          // embedding of memory_text
  "payload": {
    "customer_id": "uuid",
    "memory_type": "theme",                // theme（主題）/ person（人物）/ recurring（反覆議題）
    "memory_text": "客戶長期關注與男友小明的感情狀態，從2024年8月起多次諮詢，經歷了從熱戀→衝突→嘗試溝通→逐漸穩定的過程。客戶對塔羅的信任度高，偏好凱爾特十字牌陣。",

    // 來源追溯
    "source_summary_ids": ["uuid-1", "uuid-2", "uuid-5", "uuid-8"],
    "source_session_count": 4,
    "time_span": {
      "first": "2024-08-10T00:00:00Z",
      "last": "2025-01-15T00:00:00Z"
    },

    // 語意標籤
    "key_entities": ["小明", "感情", "溝通"],
    "themes": ["romantic_relationship", "personal_growth"],
    "sentiment_trajectory": "improving",   // improving / stable / declining

    // 管理
    "importance_score": 0.9,
    "computed_at": "2025-01-16T04:00:00Z",
    "version": 3                           // 每次重新聚合 +1
  }
}
```

### 5.4 MongoDB 搭配儲存：`conversation_raw` Collection

```jsonc
// Collection: conversation_raw
// 用途: 保留對話原文，供反查細節、審計、重新生成摘要
// Qdrant 只存摘要向量，完整內容在 MongoDB

{
  "_id": "session-uuid",
  "customer_id": "uuid",
  "reading_id": "uuid",
  "channel": "web",

  "turns": [
    {
      "role": "customer",
      "content": "我最近跟男朋友一直吵架，想問一下我們的感情走向...",
      "timestamp": "2025-01-15T20:30:15Z"
    },
    {
      "role": "ai",
      "content": "我能感受到你的不安。讓我們用凱爾特十字牌陣來看看...",
      "timestamp": "2025-01-15T20:30:25Z",
      "metadata": {
        "model": "claude-3.5-sonnet",
        "tokens_used": 320
      }
    },
    // ... more turns
  ],

  "summary_id": "qdrant-point-uuid",      // 對應 Qdrant 中的摘要向量
  "total_turns": 12,
  "total_tokens": 4850,
  "started_at": "2025-01-15T20:30:00Z",
  "ended_at": "2025-01-15T20:38:00Z",
  "created_at": "2025-01-15T20:38:01Z"
}

// 索引
// { customer_id: 1, started_at: -1 }
// { reading_id: 1 }
// { summary_id: 1 }
// TTL: { created_at: 1 }, expireAfterSeconds: 94608000  — 3年（原文比摘要保留更久供審計）
```

### 5.5 記憶檢索流程（RAG Pattern）

```
客戶開始新 Session
    │
    ▼
┌─ Step 1: 載入 Working Memory ────────────────────────────────┐
│  Redis: GET conversation:working:{customer_id}                │
│  → 最近一次 session 的對話摘要 + 最後 3 輪原文                   │
│  → 注入 LLM System Prompt 作為「短期記憶」                      │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌─ Step 2: 語意召回 Relevant Memory ───────────────────────────┐
│  當客戶提問時，取問題文字做 embedding                            │
│  Qdrant: search(collection="conversation_summaries",          │
│          vector=embed(question),                              │
│          filter={ customer_id: "uuid" },                      │
│          limit=5, score_threshold=0.72)                       │
│                                                               │
│  同時搜 long_term_memory:                                      │
│  Qdrant: search(collection="long_term_memory",                │
│          vector=embed(question),                              │
│          filter={ customer_id: "uuid" },                      │
│          limit=3, score_threshold=0.68)                       │
│                                                               │
│  → 合併結果，按 importance_score × similarity 排序              │
│  → 注入 LLM Context 作為「長期記憶」                            │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌─ Step 3: 客戶主動問歷史時 ───────────────────────────────────┐
│  Q: "我上次問感情的時候你說了什麼？"                              │
│                                                               │
│  → embed(query) → Qdrant 語意搜尋                              │
│  → 找到最相關的 summary → 取 summary_id                        │
│  → MongoDB: conversation_raw.findOne({ summary_id })          │
│  → 取原文細節回覆客戶                                           │
│                                                               │
│  ※ 有摘要先給概要，客戶追問再查原文，減少 token 消耗              │
└──────────────────────────────────────────────────────────────┘
```

### 5.6 摘要生成 Pipeline

```
Session 結束
    │
    ▼
┌─ Summarization Worker (async) ───────────────────────────────┐
│                                                               │
│  1. 從 Redis 取出完整對話                                       │
│  2. LLM 生成結構化摘要:                                         │
│     {                                                         │
│       summary_text,                                           │
│       key_topics,                                             │
│       mentioned_people,                                       │
│       mentioned_events,                                       │
│       emotion_tags,                                           │
│       sentiment_score,                                        │
│       importance_score                                        │
│     }                                                         │
│  3. Embedding API → 取得向量                                    │
│  4. Qdrant: upsert point                                      │
│  5. MongoDB: insert conversation_raw (保留原文)                 │
│  6. Neo4j: 抽取實體並建立/更新關係 (→ 見 Section 6)             │
│  7. Redis: 更新 working memory 為最新摘要                       │
│                                                               │
│  觸發條件:                                                      │
│  • session 正常結束                                             │
│  • session 超過 K=10 輪自動中間摘要                              │
│  • session idle timeout                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. ⑥ 圖 — 客戶關係圖譜 & 實體網絡

> 將客戶對話中提及的人物、事件、主題、物品建構成 Knowledge Graph，
> 用圖查詢揭示關聯性與連結強度，提供更精準的個人化建議。
> 技術候選：Neo4j / ArangoDB / Amazon Neptune / Dgraph — TBD

### 6.1 設計理念

```
┌──────────────────────────────────────────────────────────────────┐
│                    Customer Knowledge Graph                       │
│                                                                   │
│    為什麼用 Graph DB？                                             │
│    ─────────────────                                              │
│    • 客戶的「世界」是一張關係網：人 ↔ 人 ↔ 事件 ↔ 主題             │
│    • 傳統 SQL JOIN 查「朋友的朋友」要多層 subquery                  │
│    • Graph 查 N 度關係是 O(1) per hop                              │
│    • 連結強度（weight）+ 時間衰減 → 動態關係評估                    │
│    • Cypher 查詢直覺表達複雜關聯                                    │
│                                                                   │
│    應用場景：                                                      │
│    • 「小明」出現在 5 次諮詢中 → 關鍵人物，影響力高                  │
│    • 「感情」和「職場」問題有隱含關聯（同期出現）                     │
│    • 塔羅師可看到客戶的人際關係全貌，給出更精準建議                   │
│    • CaringService 偵測到關鍵人物出現負面事件 → 觸發關懷              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Node 類型（Labels）

```cypher
// ═══════════════════════════════════════════
// Node Types
// ═══════════════════════════════════════════

// ── 客戶（中心節點）──
(:Customer {
  id: "uuid",                      // = PostgreSQL customer.id
  display_name: "小美",
  membership_tier: "gold",
  created_at: datetime()
})

// ── 人物（客戶提到的人 / 人際圈 contact）──
(:Person {
  id: "uuid",
  name: "小明",
  role: "boyfriend",               // spouse / child / parent / friend / colleague / ex / ...
  contact_id: "uuid-or-null",      // ★ 若已建立 customer_contact，關聯到 PG 的 contact.id
                                   //   若僅在對話中提過、尚未建檔，則為 null
  has_birth_data: true,            // ★ 是否有出生資料（可排命盤）
  first_mentioned_at: datetime(),
  last_mentioned_at: datetime(),
  mention_count: 12
})

// ── 事件 ──
(:Event {
  id: "uuid",
  name: "吵架",
  category: "conflict",            // conflict / celebration / loss / change / achievement
  description: "與男友因工作壓力發生爭執",
  occurred_at: datetime(),         // 事件發生時間（客戶描述的）
  first_mentioned_at: datetime(),
  sentiment: -0.6
})

// ── 主題（反覆出現的議題）──
(:Topic {
  id: "uuid",
  name: "romantic_relationship",
  display_name: "感情關係",
  category: "life_domain"          // life_domain / emotion / goal / concern
})

// ── 塔羅牌（被抽到的牌）──
(:TarotCard {
  id: "the_tower",
  name: "The Tower",
  name_zh: "高塔",
  arcana: "major",                 // major / wands / cups / swords / pentacles
  number: 16
})

// ── 諮詢 Session ──
(:ReadingSession {
  id: "uuid",
  spread_type: "celtic_cross",
  question_category: "love",
  sentiment_score: -0.3,
  session_at: datetime(),
  summary_vector_id: "qdrant-point-uuid"   // 關聯 Qdrant 摘要
})

// ── 水晶/商品（客戶購買或被推薦的）──
(:Crystal {
  id: "uuid",
  name: "紫水晶",
  name_en: "Amethyst",
  properties: ["calming", "intuition", "protection"]
})

// ── 情緒狀態 ──
(:Emotion {
  id: "anxious",
  name: "焦慮",
  valence: "negative",             // positive / negative / neutral
  intensity_range: "medium"        // low / medium / high
})

// ═══════════════════════════════════════════
// ★ 命理相關 Node Types
// ═══════════════════════════════════════════

// ── 命盤（指向 Document DB 的本體）──
(:DivinationChart {
  id: "chart-uuid",
  chart_type: "astrology",         // astrology / bazi / ziwei / numerology / human_design
  chart_subtype: "natal",          // natal / transit / synastry / composite
  subject_name: "小美",
  document_ref_id: "chart-uuid-astro-001",  // → MongoDB divination_charts._id
  computed_at: datetime()
})

// ── 星座 / 宮位（占星共用）──
(:ZodiacSign {
  id: "gemini",
  name: "Gemini",
  name_zh: "雙子座",
  element: "air",                  // fire / earth / air / water
  modality: "mutable",            // cardinal / fixed / mutable
  ruling_planet: "Mercury"
})

// ── 天體 / 行星（占星用）──
(:CelestialBody {
  id: "sun",
  name: "Sun",
  name_zh: "太陽",
  category: "luminary"            // luminary / personal / social / transpersonal / node
})

// ── 八字元素（天干地支五行）──
(:BaziElement {
  id: "jia_wood",
  stem_or_branch: "甲",
  type: "heavenly_stem",          // heavenly_stem / earthly_branch
  element: "木",                   // 金木水火土
  yin_yang: "陽"
})

// ── 紫微主星 ──
(:ZiweiStar {
  id: "tian_tong",
  name: "天同",
  category: "main_star",          // main_star / minor_star / four_transformation
  nature: "福星"
})

// ── 紫微宮位 ──
(:Palace {
  id: "ming_palace",
  name: "命宮",
  domain: "self"                  // self / wealth / career / relationship / health / ...
})
```

### 6.3 Relationship 類型（Edges）

```cypher
// ═══════════════════════════════════════════
// Relationship Types with Properties
// ═══════════════════════════════════════════

// ── 客戶 ↔ 人物 ──
(:Customer)-[:KNOWS {
  relationship_type: "romantic_partner",  // romantic_partner / family / friend / colleague / acquaintance
  sentiment: 0.3,                         // 目前的情感傾向 -1~1
  strength: 0.85,                         // 連結強度 0~1（由提及頻率+情緒+時間計算）
  first_mentioned: datetime(),
  last_mentioned: datetime(),
  mention_count: 12,
  context_tags: ["love", "conflict", "growth"]
}]->(:Person)

// ── 客戶 ↔ 主題 ──
(:Customer)-[:INTERESTED_IN {
  strength: 0.9,                          // 0~1
  frequency: 15,                          // 累計提及次數
  first_asked: datetime(),
  last_asked: datetime(),
  trend: "stable"                         // increasing / stable / decreasing
}]->(:Topic)

// ── 客戶 ↔ 情緒 ──
(:Customer)-[:FEELS {
  intensity: 0.7,                         // 0~1 強度
  recorded_at: datetime(),
  session_id: "uuid",
  trigger: "relationship_conflict"        // 觸發原因
}]->(:Emotion)

// ── 客戶 ↔ 諮詢 Session ──
(:Customer)-[:HAD_READING {
  at: datetime()
}]->(:ReadingSession)

// ── 諮詢 ↔ 塔羅牌 ──
(:ReadingSession)-[:DREW {
  position: "present",                    // 牌陣位置：past / present / future / outcome ...
  is_reversed: true,
  interpretation_summary: "面對不可避免的變動"
}]->(:TarotCard)

// ── 人物 ↔ 事件 ──
(:Person)-[:INVOLVED_IN {
  role: "participant",                    // participant / cause / affected
  sentiment: -0.5
}]->(:Event)

// ── 客戶 ↔ 事件 ──
(:Customer)-[:EXPERIENCED {
  emotional_impact: -0.6,
  mentioned_in_sessions: ["uuid-1", "uuid-3"],
  mention_count: 3
}]->(:Event)

// ── 主題 ↔ 主題（隱含關聯）──
(:Topic)-[:CORRELATES_WITH {
  strength: 0.65,                         // 共現頻率計算
  co_occurrence_count: 8,
  computed_at: datetime()
}]->(:Topic)

// ── 客戶 ↔ 水晶 ──
(:Customer)-[:PURCHASED {
  at: datetime(),
  order_id: "uuid"
}]->(:Crystal)

(:Customer)-[:RECOMMENDED {
  at: datetime(),
  reason: "calming_for_anxiety",
  session_id: "uuid"
}]->(:Crystal)

// ── 塔羅牌 ↔ 主題（牌與議題的統計關聯）──
(:TarotCard)-[:ASSOCIATED_WITH {
  strength: 0.4,
  sample_size: 230                        // 全平台統計
}]->(:Topic)

// ═══════════════════════════════════════════
// ★ 命理相關 Relationships
// ═══════════════════════════════════════════

// ── 客戶 ↔ 命盤 ──
(:Customer)-[:HAS_CHART {
  is_primary: true,                       // 是否為本人主命盤
  created_at: datetime()
}]->(:DivinationChart)

// ── ★ 人物 ↔ 命盤（幫家人/朋友排的盤）──
(:Person)-[:HAS_CHART {
  is_primary: true,
  created_at: datetime()
}]->(:DivinationChart)

// ── 命盤 ↔ 命盤（合盤關聯）──
(:DivinationChart)-[:SYNASTRY_WITH {
  compatibility_score: 72,
  relationship_type: "romantic"           // romantic / business / friendship
}]->(:DivinationChart)

// ── 占星：命盤 ↔ 行星落入星座 ──
(:DivinationChart)-[:PLANET_IN_SIGN {
  planet: "Sun",
  degree: 24.15,
  house: 10,
  retrograde: false
}]->(:ZodiacSign)

// ── 占星：行星相位 ──
(:CelestialBody)-[:ASPECTED_BY {
  aspect_type: "opposition",              // conjunction / sextile / square / trine / opposition
  orb: 2.05,
  chart_id: "chart-uuid",
  other_planet: "Saturn"
}]->(:CelestialBody)

// ── 八字：命盤 ↔ 日主 ──
(:DivinationChart)-[:DAY_MASTER_IS {
  strength: "moderate",                   // strong / moderate / weak
  favorable_elements: ["水", "木"]
}]->(:BaziElement)

// ── 紫微：命盤 ↔ 宮位含主星 ──
(:Palace)-[:PALACE_CONTAINS {
  chart_id: "chart-uuid",
  brightness: "廟",                       // 廟/旺/得/利/平/不/陷
  four_transformations: ["化祿"]
}]->(:ZiweiStar)

// ── 跨系統關聯：星座 ↔ 主題（統計分析）──
(:ZodiacSign)-[:SIGN_CORRELATES {
  strength: 0.35,
  topic_frequency: 180,                  // 該星座客戶問此主題的次數
  computed_at: datetime()
}]->(:Topic)

// ── 命盤元素 ↔ 水晶推薦（五行/元素對應）──
(:BaziElement)-[:ELEMENT_MATCHES {
  reason: "補水",
  recommendation_type: "enhance"         // enhance / balance / protect
}]->(:Crystal)
```

### 6.4 連結強度演算法

```
┌──────────────────────────────────────────────────────────────────┐
│  Relationship Strength Calculation                                │
│                                                                   │
│  strength = w₁ × frequency_score                                 │
│           + w₂ × recency_score                                   │
│           + w₃ × emotional_intensity                             │
│           + w₄ × context_diversity                               │
│                                                                   │
│  其中:                                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ frequency_score   = min(mention_count / 20, 1.0)          │  │
│  │                     提及次數正規化，20次以上飽和              │  │
│  │                                                            │  │
│  │ recency_score     = exp(-λ × days_since_last_mention)     │  │
│  │                     指數衰減，λ=0.02（半衰期≈35天）          │  │
│  │                                                            │  │
│  │ emotional_intensity = abs(avg_sentiment)                   │  │
│  │                       情緒絕對值（正負都代表強連結）          │  │
│  │                                                            │  │
│  │ context_diversity = unique_topics_co_occurred / 10         │  │
│  │                     在多少不同主題中共同出現                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  權重: w₁=0.30, w₂=0.25, w₃=0.25, w₄=0.20                      │
│                                                                   │
│  定期由排程任務重新計算（每日凌晨）                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.5 Graph 查詢範例（Cypher）

```cypher
// ═══════════════════════════════════════════
// 實用查詢範例
// ═══════════════════════════════════════════

// ── Q1: 客戶的「世界全貌」—— 關鍵人物 + 關係 + 強度 ──
MATCH (c:Customer {id: $customerId})-[r:KNOWS]->(p:Person)
WHERE r.strength > 0.3
RETURN p.name, r.relationship_type, r.strength, r.sentiment,
       r.mention_count, r.last_mentioned
ORDER BY r.strength DESC

// ── Q2: 某人物相關的所有事件時間線 ──
MATCH (c:Customer {id: $customerId})-[:KNOWS]->(p:Person {name: "小明"})
MATCH (p)-[inv:INVOLVED_IN]->(e:Event)
RETURN e.name, e.category, e.occurred_at, inv.sentiment, e.description
ORDER BY e.occurred_at DESC

// ── Q3: 客戶最關注的主題 + 主題間的隱含關聯 ──
MATCH (c:Customer {id: $customerId})-[i:INTERESTED_IN]->(t:Topic)
WHERE i.strength > 0.4
OPTIONAL MATCH (t)-[cor:CORRELATES_WITH]->(t2:Topic)
WHERE cor.strength > 0.5
RETURN t.display_name, i.strength, i.frequency,
       collect({related: t2.display_name, correlation: cor.strength}) AS related_topics
ORDER BY i.strength DESC

// ── Q4: 「小明」在哪些 session 中被提到？情緒變化趨勢？ ──
MATCH (c:Customer {id: $customerId})-[:HAD_READING]->(rs:ReadingSession)
MATCH (c)-[:KNOWS]->(p:Person {name: "小明"})
WHERE rs.session_at >= p.first_mentioned_at
RETURN rs.id, rs.session_at, rs.sentiment_score, rs.question_category
ORDER BY rs.session_at

// ── Q5: 推薦水晶 — 基於客戶目前的情緒 + 關聯主題 ──
MATCH (c:Customer {id: $customerId})-[f:FEELS]->(e:Emotion)
WHERE f.recorded_at > datetime() - duration('P7D')
WITH c, collect(e.id) AS recent_emotions
MATCH (cr:Crystal)
WHERE any(prop IN cr.properties
      WHERE prop IN ['calming', 'grounding', 'protection']
      AND 'anxious' IN recent_emotions)
RETURN cr.name, cr.name_en, cr.properties

// ── Q6: 發現潛在危機 — 負面情緒 + 高強度人物 + 近期事件 ──
MATCH (c:Customer {id: $customerId})-[f:FEELS]->(e:Emotion {valence: "negative"})
WHERE f.intensity > 0.7 AND f.recorded_at > datetime() - duration('P14D')
MATCH (c)-[r:KNOWS]->(p:Person)
WHERE r.strength > 0.6 AND r.sentiment < -0.3
OPTIONAL MATCH (p)-[:INVOLVED_IN]->(ev:Event)
WHERE ev.occurred_at > datetime() - duration('P30D')
RETURN c.display_name, e.name AS emotion, f.intensity,
       p.name AS person, r.relationship_type, r.sentiment,
       ev.name AS recent_event, ev.category
```

### 6.6 實體抽取 Pipeline（對話 → Graph）

```
Session 對話結束
    │
    ▼
┌─ Entity Extraction Worker (async) ───────────────────────────┐
│                                                               │
│  Input: conversation_raw (MongoDB 的對話原文)                  │
│                                                               │
│  Step 1: LLM 結構化抽取                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Prompt:                                                  │ │
│  │ "從以下對話中抽取實體與關係，輸出 JSON：                    │ │
│  │  - people: [{name, role, sentiment}]                     │ │
│  │  - events: [{name, category, when, sentiment}]           │ │
│  │  - topics: [{name, category}]                            │ │
│  │  - emotions: [{name, intensity, trigger}]                │ │
│  │  - relationships: [{from, to, type, sentiment}]"         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Step 2: Entity Resolution（實體消歧）                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • "男朋友" = "小明" = "他" → 合併為同一 Person node       │ │
│  │ • 用 fuzzy match + context 判斷是否為已知實體              │ │
│  │ • Neo4j: MATCH (p:Person) WHERE p.name IN $candidates    │ │
│  │          AND (:Customer {id: $cid})-[:KNOWS]->(p)        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Step 3: Graph Upsert（MERGE 語意）                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • MERGE node if exists, CREATE if new                    │ │
│  │ • UPDATE relationship properties (count++, sentiment)    │ │
│  │ • Recalculate strength scores                            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Step 4: Co-occurrence 更新                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • 同一 session 中出現的 Topic pairs → CORRELATES_WITH    │ │
│  │ • co_occurrence_count++ → recalculate strength           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 6.7 Graph 視覺化 API（供 Back-office 使用）

```
┌──────────────────────────────────────────────────────────────┐
│  GET /api/v1/customers/:id/graph                              │
│                                                               │
│  Query Params:                                                │
│    depth    = 1 | 2 | 3        (關係展開層數，預設 2)          │
│    types    = person,topic,event (篩選 node 類型)             │
│    min_strength = 0.3           (最低連結強度)                 │
│    since    = 2024-06-01        (時間範圍)                    │
│                                                               │
│  Response: { nodes: [...], edges: [...] }                     │
│  → 前端用 D3.js / vis.js 渲染 force-directed graph            │
│                                                               │
│  用途:                                                        │
│  • Back-office 客服查看客戶「人際關係圖」                       │
│  • 塔羅師解讀前快速了解客戶背景                                 │
│  • CaringService 自動分析高風險關係                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. 跨儲存引擎資料流

### 7.1 新客戶註冊

```
User Register
    │
    ▼
┌─ PostgreSQL ──────────────────────┐
│  INSERT INTO customer (...)       │
│  INSERT INTO customer_consent     │
└────────┬──────────────────────────┘
         │ event: customer.created
         ▼
┌─ MongoDB ─────────────────────────┐
│  INSERT visit_logs                │
│  { action: "account.created" }    │
└────────┬──────────────────────────┘
         │
         ▼
┌─ Redis ───────────────────────────┐
│  SET session:{id}                 │
│  SET presence:{customer_id}       │
│  PFADD customer:daily_active      │
└────────┬──────────────────────────┘
         │
         ▼
┌─ InfluxDB ────────────────────────┐
│  WRITE customer_engagement        │
│  { action_type: "registration" }  │
└───────────────────────────────────┘
```

### 7.2 回訪客戶進行塔羅解讀（完整六引擎流程）

```
User starts reading
    │
    ▼
┌─ Redis ──────────────────────────────────────────────────────────┐
│  refresh session TTL, update presence → "in_reading"             │
│  GET conversation:working:{customer_id} → 載入短期記憶           │
└────────┬─────────────────────────────────────────────────────────┘
         │
         ▼
┌─ Qdrant ─────────────────────────────────────────────────────────┐
│  search(conversation_summaries, embed(question), customer_id)    │
│  search(long_term_memory, embed(question), customer_id)          │
│  → 注入 LLM context 作為長期記憶 (RAG)                            │
└────────┬─────────────────────────────────────────────────────────┘
         │
         ▼
┌─ Neo4j ──────────────────────────────────────────────────────────┐
│  MATCH (c:Customer)-[:KNOWS]->(:Person)                          │
│  → 載入客戶關鍵人物清單，幫助 AI 理解上下文                        │
└────────┬─────────────────────────────────────────────────────────┘
         │
         ▼
MongoDB: INSERT visit_logs { service: "tarot", action: "reading.started" }
InfluxDB: WRITE customer_engagement { service: "tarot", event_count: 1 }
         │
         ▼
    ═══ Reading in progress (AI 使用記憶回應) ═══
         │
         ▼
Reading completes...
         │
         ▼
┌─ Async Pipeline (event-driven) ──────────────────────────────────┐
│                                                                   │
│  MongoDB: INSERT visit_logs { action: "reading.completed" }      │
│  MongoDB: INSERT conversation_raw { turns: [...] }               │
│  InfluxDB: WRITE customer_sentiment { score: 0.7 }              │
│                                                                   │
│  ┌─ Summarization Worker ─────────────────────────────────────┐  │
│  │  LLM → 生成對話摘要 + 抽取實體                               │  │
│  │  Qdrant: upsert conversation_summaries (摘要向量)           │  │
│  │  Neo4j: MERGE Person/Event/Topic nodes + relationships     │  │
│  │  Redis: update conversation:working:{customer_id}           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  MongoDB: UPDATE customer_behavior_profile (async aggregation)   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. DAL 整合方式

所有讀寫都透過 DAL 的 gRPC API，服務本身不直接連資料庫：

```protobuf
// customer_storage.proto

service CustomerStorage {
  // ── PostgreSQL operations ──
  rpc GetProfile(CustomerIdRequest)        returns (CustomerProfile);
  rpc UpdateProfile(UpdateProfileRequest)  returns (CustomerProfile);
  rpc ListCustomers(ListCustomersRequest)  returns (CustomerList);

  // ── MongoDB operations ──
  rpc LogVisit(VisitLogRequest)            returns (Ack);
  rpc LogActivity(ActivityEventRequest)    returns (Ack);
  rpc GetVisitHistory(VisitHistoryQuery)   returns (VisitLogList);
  rpc GetBehaviorProfile(CustomerIdRequest) returns (BehaviorProfile);
  rpc StoreConversation(ConversationRawRequest)  returns (Ack);
  rpc GetConversation(ConversationQuery)         returns (ConversationRaw);

  // ── Redis operations ──
  rpc CreateSession(SessionRequest)        returns (Session);
  rpc RefreshSession(SessionIdRequest)     returns (Session);
  rpc GetPresence(CustomerIdRequest)       returns (PresenceStatus);
  rpc SetPresence(PresenceRequest)         returns (Ack);
  rpc GetWorkingMemory(CustomerIdRequest)  returns (WorkingMemory);
  rpc SetWorkingMemory(WorkingMemoryRequest) returns (Ack);

  // ── InfluxDB operations ──
  rpc WriteMetric(MetricRequest)           returns (Ack);
  rpc QueryMetrics(MetricQuery)            returns (MetricResult);

  // ── Qdrant (Vector DB) operations ──
  rpc UpsertConversationSummary(SummaryUpsertRequest)  returns (Ack);
  rpc SearchMemory(MemorySearchRequest)                returns (MemorySearchResult);
  // MemorySearchRequest { customer_id, query_text, collections[], limit, score_threshold }
  // → DAL handles: embed(query_text) → search both collections → merge & rank

  rpc UpsertLongTermMemory(LongTermMemoryRequest)      returns (Ack);
  rpc GetMemoryContext(MemoryContextRequest)            returns (MemoryContext);
  // MemoryContext = working_memory (Redis) + relevant_summaries (Qdrant) + key_people (Neo4j)
  // → One call to hydrate LLM context for a new session

  // ── Neo4j (Graph DB) operations ──
  rpc UpsertEntities(EntityUpsertRequest)              returns (Ack);
  // Batch upsert: nodes + relationships extracted from conversation

  rpc GetCustomerGraph(GraphQueryRequest)              returns (CustomerGraph);
  // GraphQueryRequest { customer_id, depth, node_types[], min_strength, since }
  // → Returns { nodes: [...], edges: [...] } for visualization

  rpc GetRelatedPeople(CustomerIdRequest)              returns (PeopleList);
  // → Key people sorted by strength, for LLM context injection

  rpc GetTopicCorrelations(TopicCorrelationRequest)    returns (TopicCorrelationResult);

  // ── Cross-storage (DAL orchestration) ──
  rpc GetFullCustomerView(CustomerIdRequest)           returns (FullCustomerView);
  // Aggregates: PG profile + Mongo behavior + Qdrant memory stats + Neo4j key relationships
}
```

---

## 9. Docker Compose 新增服務

```yaml
# 追加到根目錄 docker-compose.yml
services:
  mongodb:
    image: mongo:7
    container_name: tarot-mongodb
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_DATABASE: customer_activity_db
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ['CMD', 'mongosh', '--eval', 'db.adminCommand("ping")']
      interval: 10s
      timeout: 5s
      retries: 5

  influxdb:
    image: influxdb:2.7
    container_name: tarot-influxdb
    ports:
      - '8086:8086'
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: admin
      DOCKER_INFLUXDB_INIT_PASSWORD: tarot-influx-pw
      DOCKER_INFLUXDB_INIT_ORG: tarot-friend
      DOCKER_INFLUXDB_INIT_BUCKET: customer_metrics
      DOCKER_INFLUXDB_INIT_RETENTION: 90d
    volumes:
      - influxdb_data:/var/lib/influxdb2

  qdrant:
    image: qdrant/qdrant:v1.12
    container_name: tarot-qdrant
    ports:
      - '6333:6333'    # REST API
      - '6334:6334'    # gRPC
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      QDRANT__SERVICE__GRPC_PORT: 6334
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:6333/healthz']
      interval: 10s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5-community
    container_name: tarot-neo4j
    ports:
      - '7474:7474'    # HTTP (Browser UI)
      - '7687:7687'    # Bolt protocol
    environment:
      NEO4J_AUTH: neo4j/tarot-neo4j-pw
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
      NEO4J_dbms_memory_heap_initial__size: 512m
      NEO4J_dbms_memory_heap_max__size: 1g
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    healthcheck:
      test: ['CMD', 'cypher-shell', '-u', 'neo4j', '-p', 'tarot-neo4j-pw', 'RETURN 1']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongodb_data:
  influxdb_data:
  qdrant_data:
  neo4j_data:
  neo4j_logs:
```

---

## 10. 設計考量 & 取捨

| 決策 | 選擇 | 理由 |
|------|------|------|
| Profile 用 PostgreSQL | ✅ | 需要 ACID、外鍵、JOIN、唯一約束 |
| Visit/Activity 用 MongoDB | ✅ | Schema 彈性、高寫入吞吐、payload 結構不固定 |
| Session 用 Redis | ✅ | 極低延遲、自動 TTL、天生適合 session store |
| Time-series 用 InfluxDB | ✅ | 內建降採樣、高效時間範圍查詢、Flux 語言聚合強大 |
| 對話摘要用 Qdrant | ✅ | 高效 ANN 搜尋、payload 過濾、gRPC 原生、比 pgvector 更適合大量向量 |
| 關係圖譜用 Neo4j | ✅ | N 度關係查詢 O(1)/hop、Cypher 表達力強、GDS 內建圖演算法 |
| 三層記憶架構 | ✅ | Working(Redis) + Summary(Qdrant) + LongTerm(Qdrant) 平衡延遲與深度 |
| 對話原文存 MongoDB 非 Qdrant | ✅ | Qdrant payload 有大小限制、MongoDB 適合大文件+TTL 管理 |
| Entity extraction 用 LLM | ✅ | NER/RE 傳統模型對中文口語效果差，LLM 理解上下文更好 |
| 連結強度含時間衰減 | ✅ | 半衰期 35 天，確保圖譜反映「現在的」關係而非歷史堆積 |
| behavior_profile 在 MongoDB 而非 PG | ✅ | 聚合結果是巢狀 JSON，Mongo document model 更自然 |
| visit_logs 設 TTL | ✅ | 2 年後自動清除原始紀錄，降採樣的指標保留在 InfluxDB |
| DAU 用 HyperLogLog | ✅ | O(1) 記憶體統計，誤差 <1%，不需儲存每個 customer_id |
| finance_record 留在 PG | ✅ | 財務資料需要嚴格 ACID、審計追蹤、精確 DECIMAL |

### 六引擎職責分工一覽

```
┌──────────────────────────────────────────────────────────────────┐
│  Storage Engine         │ 核心職責           │ 資料特性           │
├─────────────────────────┼────────────────────┼───────────────────┤
│  PostgreSQL             │ 身份 & 交易        │ 結構化、ACID       │
│  MongoDB                │ 行為 & 對話原文     │ 半結構化、高寫入    │
│  Redis                  │ 即時狀態 & 短期記憶  │ 極低延遲、TTL      │
│  InfluxDB               │ 時序指標 & 趨勢     │ 高頻寫入、聚合     │
│  Qdrant                 │ 語意記憶 & RAG 檢索  │ 向量相似度搜尋     │
│  Neo4j                  │ 關係圖譜 & 連結分析  │ 圖遍歷、模式匹配   │
└──────────────────────────────────────────────────────────────────┘
```
