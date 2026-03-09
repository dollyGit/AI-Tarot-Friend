---
name: customer-service-agent
description: |
  TarotFriend 客服關懷專家。負責主動關懷策略設計、留存機制、排程觸發規則（不活躍天數、情緒下降、
  購後關懷、預約後關懷、購物車遺棄）、時間觸發（生日、節慶、每週/月摘要）、關懷計畫生命週期管理、
  訊息模板設計（LINE/Email/SMS × zh-TW/EN）、頻道選擇邏輯、再參與遞進策略、成效衡量指標。
  當工作涉及 CaringService、Nudge 模型、關懷排程、留存策略、節慶行銷、訊息模板、CRM 主動觸達時，
  務必使用此技能。
  Customer Service Agent for TarotFriend. Expert in proactive care strategy, retention mechanisms,
  scheduled triggers (inactivity, mood decline, post-purchase, post-appointment, cart abandonment),
  time-based triggers (birthday, holidays, weekly/monthly summaries), caring plan lifecycle,
  message templates (LINE/Email/SMS × zh-TW/EN), channel selection logic, re-engagement sequences,
  and effectiveness metrics. Always invoke when working on CaringService, Nudge model, caring schedules,
  retention strategy, holiday campaigns, message templates, or CRM proactive outreach.
---

# Customer Service Agent — TarotFriend 客服關懷專家

## 角色定位

客服關懷專家是 TarotFriend 五大 AI Agent 鏈的最終執行者，負責將前四位專家的分析結果
轉化為具體的客戶觸達行動。

```
Technical Expert ─── Data Processing Expert ─── Tarot Expert
                          │                         │
                          ▼                         ▼
                    Psychology Expert ◄────── 融合牌義+數據
                          │
                          ▼
              ══► Customer Service Agent ◄══
                   (主動關懷 + 留存)
                          │
                    ┌─────┼─────┐
                    ▼     ▼     ▼
                  LINE  Email   SMS
```

### 核心職責

1. **主動關懷觸發** — 根據規則引擎決定何時、如何、透過什麼頻道聯繫使用者
2. **訊息內容生成** — 結合塔羅意象與心理學技巧，生成溫暖且個人化的訊息
3. **再參與策略** — 設計遞進式的不活躍使用者挽回流程
4. **節慶與生日關懷** — 結合台灣文化的節慶觸發系統
5. **情緒介入** — 偵測到情緒下降時的主動關懷
6. **成效衡量** — 追蹤點擊率、回訪率、留存率

---

## CaringService 架構參考

### 服務定位

```
CaringService (Python + FastAPI)
Port: 3020
Database: caring_db (PostgreSQL)

核心資料表:
├── CaringPlan     — 關懷計畫（頻率、方式、狀態）
├── CaringAction   — 已執行的關懷動作
├── SentimentHistory — 情緒趨勢記錄
├── CaringTemplate — 訊息範本
└── CaringRule     — 觸發規則
```

### Kafka 消費者

CaringService 訂閱以下 Kafka topics：

| Topic | 觸發動作 |
|-------|---------|
| `customer.created` | 建立歡迎關懷計畫 |
| `reading.completed` | 更新情緒記錄、評估是否需要跟進 |
| `order.placed` | 建立購後關懷計畫 |
| `appointment.booked` | 建立預約前提醒 |
| `appointment.completed` | 建立預約後回饋邀請 |
| `sentiment.alert` | 立即建立情緒介入計畫 |

### Kafka 生產者

| Topic | 內容 |
|-------|------|
| `caring.action_triggered` | 通知 TarotReading（LINE）或 CustomerMgmt 執行具體發送 |

### Nudge Model（現有 Prisma Schema）

```prisma
model Nudge {
  id           String    @id @default(uuid()) @db.Uuid
  user_id      String    @db.Uuid
  trigger_type String    @db.VarChar(30)  // 觸發類型
  template_id  String?   @db.VarChar(50)  // 對應模板
  channel      String    @db.VarChar(20)  // 'email', 'line'
  status       String    @default("pending") @db.VarChar(20)
  sent_at      DateTime? @db.Timestamptz
  clicked_at   DateTime? @db.Timestamptz
  created_at   DateTime  @default(now()) @db.Timestamptz
}
```

---

## 觸發類型分類

### 一、時間基觸發（Time-Based）

| 觸發類型 | trigger_type | 頻率 | 優先級 |
|---------|-------------|------|-------|
| 不活躍提醒 (7天) | `inactivity_7d` | 一次性 | P2 |
| 不活躍提醒 (14天) | `inactivity_14d` | 一次性 | P1 |
| 不活躍提醒 (30天) | `inactivity_30d` | 一次性 | P1 |
| 不活躍提醒 (60天) | `inactivity_60d` | 一次性 | P0 |
| 不活躍提醒 (90天) | `inactivity_90d` | 一次性 | P0 |
| 每週摘要 | `weekly_summary` | 每週一 | P3 |
| 每月摘要 | `monthly_summary` | 每月 1 日 | P3 |
| 生日祝福 | `birthday` | 每年 | P1 |
| 節慶關懷 | `holiday_{code}` | 依節慶 | P2 |

### 二、條件基觸發（Condition-Based）

| 觸發類型 | trigger_type | 條件 | 優先級 |
|---------|-------------|------|-------|
| 情緒下降 | `mood_decline` | compound_score 下降 ≥ 0.3 | P0 |
| 危機跟進 (24h) | `crisis_followup_24h` | 觸發 Tier 1/2 危機 | P0 |
| 危機跟進 (72h) | `crisis_followup_72h` | 觸發 Tier 1/2 危機 | P1 |
| 危機週監測 | `crisis_weekly_4w` | 觸發 Tier 1 危機 | P2 |
| 購後關懷 | `post_purchase` | order.placed 後 3 天 | P2 |
| 預約前提醒 | `pre_appointment` | 預約前 24 小時 | P1 |
| 預約後關懷 | `post_appointment` | appointment.completed 後 | P2 |
| 購物車遺棄 | `cart_abandoned` | 加入購物車 24h 未結帳 | P2 |
| 正向回饋感謝 | `positive_feedback` | rating ≥ 4 | P3 |
| 訂閱即將到期 | `subscription_expiring` | 到期前 7 天 | P1 |

### 三、優先級定義

| 級別 | 意義 | 頻率限制 |
|------|------|---------|
| P0 | 緊急 — 必須在 1 小時內發送 | 不受頻率限制 |
| P1 | 高 — 當天內發送 | 一天最多 2 則 P1 |
| P2 | 中 — 48 小時內發送 | 一天最多 1 則 P2 |
| P3 | 低 — 一週內發送 | 一週最多 2 則 P3 |

### 頻率節流規則

```python
MAX_NUDGES_PER_DAY = 3       # 任何使用者一天最多 3 則（P0 除外）
MAX_NUDGES_PER_WEEK = 7      # 任何使用者一週最多 7 則
MIN_INTERVAL_HOURS = 4       # 兩則之間至少 4 小時（P0 除外）
QUIET_HOURS = (22, 8)        # 晚上 10 點到早上 8 點不發送（P0 除外）
```

---

## 關懷計畫生命週期

```
                 ┌────────────────────────────────────────┐
                 │           CaringPlan Lifecycle          │
                 │                                         │
   Kafka Event   │  ┌─────┐   ┌──────┐   ┌────────┐      │
   ──────────►   │  │Draft│──►│Active│──►│Executing│      │
                 │  └─────┘   └──────┘   └────┬───┘      │
                 │                             │          │
                 │                    ┌────────┼────────┐ │
                 │                    ▼        ▼        ▼ │
                 │               ┌──────┐ ┌──────┐ ┌────┐│
                 │               │Paused│ │Done  │ │Fail││
                 │               └──────┘ └──────┘ └────┘│
                 │                                         │
                 └────────────────────────────────────────┘
```

### 狀態轉換

| 狀態 | 描述 | 轉換觸發 |
|------|------|---------|
| `draft` | 初始建立，等待排程 | Kafka event 或 cron job |
| `active` | 排程確認，等待執行時間 | 通過頻率節流檢查 |
| `executing` | 正在發送 | 到達排程時間 |
| `done` | 成功發送 | 頻道確認送達 |
| `paused` | 暫停（使用者設定免打擾） | 使用者 opt-out |
| `failed` | 發送失敗 | 頻道 API 錯誤，3 次重試後 |

### 關懷計畫建立流程

```python
async def create_caring_plan(event: KafkaEvent) -> CaringPlan:
    # 1. 判斷觸發規則
    rules = await get_matching_rules(event)

    # 2. 檢查頻率限制
    for rule in rules:
        if not await check_throttle(event.customer_id, rule.priority):
            continue

        # 3. 選擇頻道
        channel = await select_channel(event.customer_id)

        # 4. 選擇模板
        template = await select_template(rule.trigger_type, channel)

        # 5. 個人化內容
        content = await personalize(template, event.customer_id)

        # 6. 建立計畫
        plan = await CaringPlan.create(
            customer_id=event.customer_id,
            trigger_type=rule.trigger_type,
            template_id=template.id,
            channel=channel,
            content=content,
            scheduled_at=calculate_send_time(rule),
            priority=rule.priority,
            status="active"
        )

    return plan
```

---

## 頻道選擇邏輯

### 頻道優先順序

```
LINE > Email > SMS > Push Notification
```

### 選擇矩陣

| 條件 | LINE | Email | SMS |
|------|------|-------|-----|
| 使用者有 LINE ID | 首選 | 備選 | 最後 |
| 使用者無 LINE ID | — | 首選 | 備選 |
| 緊急（P0） | 首選 | 同時 | 同時 |
| 長文內容（月摘要） | — | 首選 | — |
| 互動式（投票、快速回覆） | 首選 | — | — |
| 行銷推廣 | — | 首選 | — |

### 頻道特性

| 頻道 | 開啟率 | 即時性 | 互動能力 | 成本 |
|------|-------|--------|---------|------|
| LINE | ~70% | 高 | 高（Rich Menu, Quick Reply） | 中 |
| Email | ~20% | 低 | 低 | 低 |
| SMS | ~90% | 高 | 無 | 高 |
| Push | ~40% | 高 | 中 | 低 |

---

## 再參與策略（Re-engagement Sequence）

### 不活躍遞進策略

```
Day 0: 最後一次登入
  │
Day 7: [inactivity_7d]
  │  語氣：輕鬆、好奇
  │  「好久不見！最近有什麼想問牌的嗎？」
  │  CTA: 免費單張抽牌
  │
Day 14: [inactivity_14d]
  │  語氣：溫暖、關懷
  │  「想念你了。你最近還好嗎？」
  │  CTA: 特別主題牌陣（限時免費）
  │
Day 30: [inactivity_30d]
  │  語氣：真誠、不施壓
  │  「我為你抽了一張牌，想看看嗎？」
  │  CTA: 預抽牌結果預覽 + 解鎖連結
  │
Day 60: [inactivity_60d]
  │  語氣：溫和告別 + 留一扇門
  │  「我會在這裡等你，隨時歡迎回來。」
  │  CTA: 回饋問卷（了解離開原因）
  │
Day 90+: [inactivity_90d]
  │  語氣：節慶或特殊時機才觸發
  │  僅在生日/重大節日發送
  │  CTA: 特別優惠 + 回歸禮包
  │
Day 180+:
     停止主動聯繫（除非使用者重新啟動）
```

### 情緒下降介入策略

```
Session 結束 → 情緒分數 < -0.5 (且下降 ≥ 0.3)
  │
  ├─ 非危機：
  │    │
  │    ├─ 立即：在 session 結束時附加關懷語句
  │    │         「今天聊了不少，希望你有感覺好一些。」
  │    │
  │    ├─ +24h：[mood_decline] LINE 訊息
  │    │         「昨天的牌給了你很深的訊息，我想關心你今天好不好？」
  │    │
  │    └─ +72h：檢查是否有新 session
  │              有 → 觀察新 session 情緒
  │              無 → 發送鼓勵訊息 + 1925 資源（軟性）
  │
  └─ 危機級別 (Tier 1/2)：
       │
       ├─ 立即：crisis-protocol.md 標準流程
       │
       ├─ +24h：[crisis_followup_24h]
       │         「昨天謝謝你願意跟我分享。今天過得怎麼樣？」
       │
       ├─ +72h：[crisis_followup_72h]
       │         溫和關心 + 專業資源
       │
       └─ 每週×4：[crisis_weekly_4w]
                   持續低調關心，不提及危機本身
```

---

## 訊息設計原則

### 核心原則

1. **個人化** — 使用 display_name，引用最近牌陣/話題
2. **簡短溫暖** — LINE 訊息 ≤ 100 字，Email ≤ 300 字
3. **行動召喚 (CTA)** — 每則訊息至少一個明確的下一步
4. **雙語支持** — 根據 user.locale 選擇 zh-TW 或 EN
5. **尊重同意** — 遵守 customer_consent 設定，提供退訂連結
6. **塔羅意象** — 訊息中融入塔羅元素，維持品牌一致性
7. **不施壓** — 絕不使用罪惡感、急迫感或 FOMO 語言

### 個人化變數

```
{{display_name}}     — 使用者暱稱
{{last_card}}        — 最近一次抽到的牌名（zh）
{{last_spread}}      — 最近一次使用的牌陣
{{days_since}}       — 距離上次登入天數
{{sentiment_trend}}  — 情緒趨勢描述
{{upcoming_holiday}} — 即將到來的節慶
{{zodiac_sign}}      — 星座
{{chinese_zodiac}}   — 生肖
{{life_area}}        — 最常討論的生活領域
```

### 反模式（絕對避免）

- "你已經 X 天沒來了" — 施壓，製造罪惡感
- "限時優惠即將結束！" — FOMO 語言
- "你的帳號即將被停用" — 恐嚇
- "你錯過了 X 個解讀機會" — 製造損失感
- 過度使用表情符號 — 一則訊息最多 1-2 個
- 連續發送相同類型的訊息 — 重複感
- 在深夜/清晨發送非緊急訊息 — 打擾

---

## 成效衡量指標

### 核心 KPIs

| 指標 | 定義 | 目標 |
|------|------|------|
| **開啟率** | 開啟數 / 發送數 | LINE > 60%, Email > 25% |
| **點擊率 (CTR)** | CTA 點擊數 / 開啟數 | > 15% |
| **回訪率** | 收到 nudge 後 48h 內回訪的比例 | > 20% |
| **情緒改善** | 情緒介入後 7 天情緒分數變化 | 平均提升 ≥ 0.2 |
| **流失挽回率** | 不活躍使用者回訪 / 不活躍總數 | > 10% |
| **退訂率** | 退訂數 / 發送數 | < 1% |
| **NPS** | Net Promoter Score | > 40 |

### InfluxDB 追蹤格式

```python
# 每次關懷動作完成後寫入
await influx_write('caring_action', {
    'tags': {
        'trigger_type': plan.trigger_type,
        'channel': plan.channel,
        'priority': str(plan.priority),
        'template_id': plan.template_id,
    },
    'fields': {
        'sent': 1,
        'opened': 0,      # 待追蹤
        'clicked': 0,      # 待追蹤
        'revisited': 0,    # 待追蹤
    },
    'timestamp': datetime.utcnow()
})
```

### Grafana Dashboard 建議

```
Row 1: 發送量趨勢（按 trigger_type 分）
Row 2: 開啟率 / 點擊率（按 channel 分）
Row 3: 回訪率（按 trigger_type 分）
Row 4: 情緒介入成效（前後情緒分數對比）
Row 5: 不活躍漏斗（7d → 14d → 30d → 60d → 90d）
Row 6: 退訂率趨勢 + 退訂原因分布
```

---

## 購後關懷流程

### 水晶商品購後關懷

```
order.placed (from ShoppingCart Shopify webhook)
  │
  ├─ +1h: 訂單確認 + 水晶使用建議預告
  │        「你的 {{crystal_name}} 正在準備出貨中！
  │         到貨後我會教你如何搭配塔羅能量使用它。」
  │
  ├─ +3d (預估到貨): 到貨確認 + 使用指南
  │        「{{crystal_name}} 應該已經到了！
  │         這顆水晶的能量特別適合搭配 {{related_card}} 的能量...
  │         [水晶淨化指南連結]」
  │
  └─ +7d: 使用回饋邀請
           「你跟 {{crystal_name}} 相處一週了，
            有感受到什麼變化嗎？
            [分享體驗] [再看看其他水晶]」
```

### 預約相關關懷

```
appointment.booked
  │
  ├─ +0: 預約確認
  │
  ├─ -24h: 預約前提醒
  │        「明天就是你跟 {{tarotist_name}} 的諮詢了！
  │         建議你先想想最想問的問題。」
  │
appointment.completed
  │
  ├─ +2h: 回饋邀請
  │        「跟 {{tarotist_name}} 的諮詢感覺如何？
  │         你的回饋會幫助其他人找到適合的老師。
  │         [留下評價]」
  │
  └─ +7d: 後續關懷
          「上週諮詢中提到的事情有進展嗎？
           如果有什麼想再聊的，AI 塔羅隨時在。」
```

---

## 訂閱生命週期管理

| 時間點 | trigger_type | 內容 |
|--------|-------------|------|
| 訂閱成功 | `subscription_created` | 歡迎 + Premium 功能導覽 |
| 到期前 30 天 | `subscription_reminder_30d` | 使用摘要 + 續訂價值 |
| 到期前 7 天 | `subscription_expiring` | 明確提醒 + 續訂 CTA |
| 到期當天 | `subscription_expired` | 感謝 + 降級功能說明 |
| 到期後 7 天 | `subscription_winback_7d` | 限時回歸優惠 |
| 到期後 30 天 | `subscription_winback_30d` | 最後邀請 |

---

## 與其他 Agent 的協作介面

### 從 Psychology Expert 接收

```json
{
  "customer_id": "uuid",
  "emotional_assessment": {
    "compound_score": -0.55,
    "trend_direction": -0.2,
    "primary_emotion": "焦慮",
    "tone_level": "empathetic",
    "crisis_level": "none"
  },
  "relationship_context": {
    "key_person": "母親",
    "attachment_pattern": "anxious",
    "recent_topic": "家庭壓力"
  },
  "recommended_actions": [
    "mood_decline_followup",
    "suggest_professional_support"
  ]
}
```

### 從 Data Processing Expert 接收

```json
{
  "customer_id": "uuid",
  "engagement_metrics": {
    "days_since_last_visit": 12,
    "session_count_30d": 3,
    "avg_session_duration": "8min",
    "preferred_channel": "line",
    "preferred_spread": "3-card"
  },
  "upcoming_events": {
    "birthday_in_days": null,
    "next_holiday": { "name": "中秋節", "days": 15 },
    "subscription_expires_in": 45
  }
}
```

### 輸出給執行層

```json
{
  "action": "send_nudge",
  "customer_id": "uuid",
  "channel": "line",
  "template_id": "mood_decline_24h",
  "personalized_content": "...",
  "scheduled_at": "2025-08-15T10:00:00+08:00",
  "priority": "P0",
  "metadata": {
    "trigger_type": "mood_decline",
    "caring_plan_id": "uuid",
    "retry_count": 0
  }
}
```

---

## 開發指南

### 新增觸發規則

1. 在 `caring-rules.md` 定義規則 JSON（condition + action + priority）
2. 在 `templates.md` 建立對應模板（zh-TW + EN × LINE + Email）
3. 在 CaringRule 資料表新增記錄
4. 建立 Kafka consumer handler（如果是新的 event type）
5. 更新頻率節流配置（如有特殊需求）
6. 在 Grafana dashboard 新增監控面板

### 新增節慶觸發

1. 在 `calendar-triggers.md` 新增節慶定義
2. 為該節慶選擇/設計關聯塔羅牌
3. 撰寫 zh-TW + EN 節慶模板
4. 設定排程時間（農曆需轉換）
5. 在 A/B 測試框架中加入變體

### 效果不佳時的調整策略

| 問題 | 診斷指標 | 調整方向 |
|------|---------|---------|
| 低開啟率 | < 40% (LINE), < 15% (Email) | 調整發送時間、改善主旨 |
| 低點擊率 | CTR < 10% | 改善 CTA 文案、簡化操作步驟 |
| 高退訂率 | > 2% | 降低頻率、改善內容相關性 |
| 低回訪率 | < 10% | 強化個人化、提供更有價值的內容 |
| 投訴增加 | 任何投訴 | 立即審查觸發規則和內容 |
