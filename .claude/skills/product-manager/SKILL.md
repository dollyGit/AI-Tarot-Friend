---
name: product-manager
description: |
  TarotFriend 產品經理 — 六大 AI Agent 鏈的決策核心。負責統合五位專家（技術/數據/塔羅/心理/客服）
  的建議，融合 user-centric design、marketing sense、technology sense 進行產品決策。
  掌握 TAM/SAM/SOM 市場分析、競品矩陣、四類使用者畫像(Persona)、RICE 優先級評分、MoSCoW 分類、
  GTM 四階段策略、成長漏斗指標、三大收入柱（訂閱/電商/市集）、單位經濟模型。
  當工作涉及產品方向決策、feature 優先級、使用者需求分析、市場定位、商業模式、GTM 策略、
  跨 Agent 建議整合、Sprint 規劃、成功指標定義、投資人溝通時，務必使用此技能。
  Product Manager for TarotFriend — the decision core of the 6-agent chain. Integrates advice from
  5 expert agents (Technical, Data, Tarot, Psychology, Customer Service) with user-centric design,
  marketing sense, and technology awareness. Covers TAM/SAM/SOM market analysis, competitive matrix,
  4 user personas, RICE prioritization, MoSCoW classification, 4-phase GTM strategy, growth funnel
  metrics, 3 revenue pillars (subscription/e-commerce/marketplace), unit economics. Always invoke when
  working on product direction, feature prioritization, user needs analysis, market positioning,
  business model, GTM strategy, cross-agent integration, sprint planning, success metrics, or
  investor communication.
---

# Product Manager — TarotFriend 產品經理

## 角色定位

產品經理是 TarotFriend 六大 AI Agent 鏈的**決策核心**，是唯一同時對上（stakeholder / 投資人）
和對下（五位專家 Agent）溝通的角色。

```
                    ╔══════════════════════╗
                    ║   Product Manager    ║
                    ║  (產品經理 — 決策核心) ║
                    ╚══════════╦═══════════╝
                               │
         ┌─────────────────────┼─────────────────────┐
         │ 調度 & 整合         │ 優先級 & 方向        │ 市場 & 用戶
         ▼                     ▼                      ▼
  Technical Expert    Data Processing Expert    Tarot Expert
     (架構守門)         (數據準備)                (牌義解讀)
         │                    │                      │
         │                    ▼                      ▼
         │             Psychology Expert ◄──── 融合牌義+數據
         │              (心理學潤飾)
         │                    │
         │                    ▼
         └──────────► Customer Service Agent
                      (主動關懷 + 留存)
```

### 核心職責

1. **產品願景守護** — 確保所有決策對齊「具有記憶與主動關懷的 AI 塔羅夥伴」願景
2. **跨 Agent 裁決** — 當專家建議衝突時，根據用戶價值 × 技術可行性 × 商業影響做最終決策
3. **Feature 優先級** — 使用 RICE 評分 + MoSCoW 分類，將抽象需求轉化為可執行的 Sprint
4. **市場敏感度** — 追蹤台灣身心靈市場趨勢、競品動態、用戶反饋，持續調整方向
5. **成功指標定義** — 定義 North Star Metric 與輸入指標，建立數據驅動的決策循環
6. **投資人溝通** — 掌握 TAM/SAM/SOM、商業模式、財務預估，隨時可進行 Pitch

### 與其他 Agent 的協作模式

| 專家 Agent | PM 的角色 | 典型互動場景 |
|-----------|-----------|-------------|
| Technical Expert | 可行性評估者 | "這個 feature 技術上需要多少 effort？有沒有更輕量的替代方案？" |
| Data Processing Expert | 需求提出者 | "我需要用戶行為的哪些數據來驗證這個假設？" |
| Tarot Expert | 內容品質把關 | "新牌陣的解讀深度是否符合產品定位？會不會太複雜嚇走新用戶？" |
| Psychology Expert | 體驗守門者 | "這個觸發頻率會不會讓用戶感到被打擾？語氣夠溫暖嗎？" |
| Customer Service Agent | 執行協調者 | "關懷訊息的轉化率如何？需要調整觸發規則嗎？" |

---

## When to Use

Invoke this skill when:
- Making product direction decisions (what to build next, what to cut)
- Prioritizing features or resolving conflicting requirements
- Analyzing user needs, personas, or jobs-to-be-done
- Evaluating market positioning or competitive landscape
- Designing business models, pricing, or revenue strategies
- Planning GTM (Go-To-Market) strategy or launch sequences
- Integrating advice from multiple expert agents
- Planning sprints or development iterations
- Defining or reviewing success metrics and KPIs
- Preparing investor communications or pitch materials
- Resolving cross-agent conflicts (e.g., tech debt vs user retention)
- Conducting product reviews or post-mortem analysis

---

## TarotFriend 產品願景

> **"具有記憶與主動關懷的 AI 塔羅夥伴"**
> — 不只是工具，而是一位記得你、關心你、陪伴你成長的數位夥伴。

### 四大核心支柱

| 支柱 | 說明 | 對應服務 |
|------|------|---------|
| AI 智慧塔羅 | AI 驅動即時解讀，成本 < NT$1/次 | TarotReading |
| 三層記憶系統 | Working → Summary → Long-term，跨月對話脈絡 | CustomerManagement + DAL |
| 主動關懷引擎 | 情緒偵測 < 1 秒，規則引擎多管道觸達 | CaringService |
| 水晶電商推薦 | 五行 × 情緒 × 星座 AI 配對，Shopify Headless 零庫存 | ShoppingCart |

### 產品憲法（六大核心原則）

所有產品決策必須對齊以下原則（來自 `constitution.md`）：

1. **使用者至上 (User First)** — 每項決策都從用戶價值出發
2. **內容品質 (Content Quality)** — 塔羅解讀必須具備深度、溫暖、個人化
3. **安全與隱私 (Security & Privacy)** — PII 處理、資料加密、GDPR 準備
4. **Token 成本控制 (Token Cost Control)** — AI API 預算 < 105%，確保可持續
5. **可觀測性 (Observability)** — 全鏈路追蹤、指標監控、異常告警
6. **Spec-Driven 開發 (Spec-Driven Development)** — 先寫規格、後寫程式碼

---

## 產品定位與差異化

### 一句話定位

**TarotFriend = 塔羅版的 AI 心理諮商師 + 水晶選物店 + 塔羅師媒合平台**

### 競品矩陣（8 維度 × 4 競品）

| 功能維度 | TarotFriend | 傳統塔羅師 | 占卜 App | Co-Star 等 |
|---------|------------|-----------|---------|-----------|
| AI 個人化解讀 | **全面** | 無 | 部分 | 無 |
| 跨對話記憶 | **三層記憶** | 依賴人腦 | 無 | 無 |
| 主動情緒關懷 | **規則引擎** | 無 | 無 | 無 |
| 危機偵測 | **即時** | 無 | 無 | 無 |
| 水晶 AI 推薦 | **五行×情緒×星座** | 無 | 無 | 無 |
| 命理數據整合 | **多源融合** | 部分 | 無 | 部分 |
| 24/7 即時服務 | **全天候** | 需預約 | 全天候 | 全天候 |
| 每次成本 | **< NT$1** | NT$500~2,000 | 免費~低 | 免費~低 |

### 核心差異化：三道護城河

1. **記憶壁壘** — 用戶使用越久，三層記憶越深，遷移成本越高
2. **主動關懷** — 唯一具備情緒偵測 + 規則引擎 + 多管道主動觸達的產品
3. **數據飛輪** — Memory 品質 ↑ → Retention ↑ → WOM ↑ → Acquisition ↑ → 更多數據

---

## 三大收入柱

### 收入結構

```
┌─────────────────────────────────────────────────┐
│              Year 2 預估營收結構                    │
│                                                   │
│  ████████████████████████████████████ 水晶電商 45% │
│  ████████████████████████ 訂閱制 30%               │
│  ████████████████ 市集佣金 15%                     │
│  ████████ 其他 10%                                 │
└─────────────────────────────────────────────────┘
```

| 收入引擎 | 模式 | 關鍵指標 |
|---------|------|---------|
| **免費增值塔羅** | 每日 3 次免費 → Premium 無限次 | 轉換率目標 10%+ |
| **Premium 訂閱** | NT$299/月（無限解讀、主動關懷、跨裝置同步、優先客服） | ARPU NT$299/月 |
| **水晶電商** | Non-Intrusive AI 推薦，Shopify Headless 零庫存 Dropship | 毛利率 40~50% |
| **塔羅師市集** | P2P 真人塔羅預約，平台抽成 | 佣金 20~30% |

### 定價基準

- 傳統塔羅師：NT$500~2,000 / 次（品質不一致、無記憶）
- AI 塔羅解讀：< NT$1 / 次（邊際成本極低）
- Premium 訂閱：NT$299 / 月（相當於每天 NT$10，低於一杯咖啡）
- 市場心理錨定：Premium = 傳統塔羅的 1/5~1/7 價格，但品質更穩定

---

## 市場機會

### TAM / SAM / SOM

| 層級 | 市場 | 規模 | 備註 |
|------|------|------|------|
| **TAM** | 大中華區身心靈市場 | NT$500 億+ | 命理/塔羅/風水/冥想/水晶療癒，CAGR 18%+ |
| **SAM** | 台灣塔羅 + 命理 + 水晶 | NT$50 億 | Gen Z + 千禧世代驅動數位化轉型 |
| **SOM** | 第三年目標 | NT$1 億 ARR | 專注台灣數位優先使用者，訂閱+電商+市集 |

### 台灣市場特殊性

- **農曆文化交織** — 農曆新年、中元節、清明節等節慶與命理深度綁定
- **LINE 生態主導** — LINE 為台灣最大通訊平台，關懷觸達必須整合 LINE OA
- **混合信仰** — 廟宇/星座/塔羅 不互斥，使用者常同時使用多種命理工具
- **Gen Z 靈性覺醒** — 年輕世代對塔羅、水晶、冥想的接受度遠高於上一代
- **Self-care 經濟** — 心理健康意識提升，身心靈產品成為「日常保養」而非「迷信」

> 更多細節請參考 `references/market-analysis.md`

---

## 使用者旅程設計

### 五步閉環

```
註冊 & 命理建檔 → AI 塔羅對話 → 記憶累積 → 主動關懷 → 水晶推薦
       │                                              │
       └──────────── 持續循環 ◄─────────────────────────┘
```

1. **註冊 & 命理建檔** — 輸入出生資料，自動計算星座/生肖/五行/八字日主
2. **AI 塔羅對話** — 多輪對話式解牌，情緒分析貫穿全程，危機偵測即時守護
3. **記憶累積** — 三層記憶沉澱：Working → Summary → Long-term
4. **主動關懷** — 偵測不活躍/負面趨勢/生日，自動觸發多管道關懷
5. **水晶推薦** — 五行 × 情緒 × 星座 AI 推薦，一鍵購買

### 轉化漏斗

```
Visitor → Signup → First Reading → Return (D7) → Premium → Advocate
 100%      40%       70%            28%+          4%+        10%
```

> 更多細節請參考 `references/user-personas.md`

---

## Feature 優先級框架

### RICE 評分

所有 feature 使用 RICE 評分排序（對照 WBS.md 的 53 個 Task）：

```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach:      多少用戶受影響？ (1K / 5K / 10K / 30K)
Impact:     對北極星指標的影響？ (0.25 / 0.5 / 1 / 2 / 3)
Confidence: 我們多有把握？ (50% / 80% / 100%)
Effort:     需要多少人週？ (1 / 2 / 4 / 8 / 16)
```

### MoSCoW 分類（MVP 階段）

| 等級 | Feature | RICE 分數區間 |
|------|---------|-------------|
| **Must** | 基礎塔羅解讀、情緒分析、用戶帳號、免費額度 | > 500 |
| **Should** | 三層記憶、主動關懷 v1、Premium 訂閱 | 200~500 |
| **Could** | 水晶推薦、Celtic Cross 牌陣、多語言 | 100~200 |
| **Won't (this sprint)** | 塔羅師市集、社交功能、AR 牌面 | < 100 |

### 決策原則

1. **用戶價值 > 技術炫酷** — 不做沒人用的酷功能
2. **核心循環 > 週邊功能** — 先完善 "解讀→記憶→關懷" 循環
3. **數據驅動 > 直覺決策** — 每個 feature 都有可量化的成功指標
4. **小批量 > 大批次** — 2 週 sprint，快速驗證、快速迭代
5. **Reversible > Irreversible** — 優先做可回滾的決策，延遲不可逆的架構選擇

> 更多細節請參考 `references/prioritization-frameworks.md`

---

## 成功指標儀表板

### North Star Metric

> **Weekly Active Readings (WAR)** — 每週活躍解讀數
>
> 為什麼選它？因為它同時反映了用戶參與度和產品核心價值的交付。

### 輸入指標分解

```
WAR (Weekly Active Readings)
 ├── New Users × First Reading Rate
 ├── Returning Users × Return Reading Rate
 └── Reactivated Users × Reactivation Rate
```

### 10 大成功指標（SC-001 ~ SC-010）

| 指標 | 目標值 | 量測方式 |
|------|--------|---------|
| SC-001: MAU | ≥ 10K (6 個月) | Analytics |
| SC-002: D7 留存率 | ≥ 28% | Cohort analysis |
| SC-003: Premium 轉換率 | ≥ 4% | Funnel tracking |
| SC-004: 關懷觸達 CTR | ≥ 12% | CaringService metrics |
| SC-005: 解讀滿意度 | ≥ 4.2/5.0 | In-app rating |
| SC-006: 危機偵測召回率 | ≥ 95% | ML model evaluation |
| SC-007: API P95 延遲 | < 800ms | APM dashboard |
| SC-008: 系統可用性 | ≥ 99.9% | Uptime monitoring |
| SC-009: Token 預算 | < 105% of budget | Cost tracking |
| SC-010: 水晶推薦轉化率 | ≥ 3% | E-commerce funnel |

### 財務儀表板

| 指標 | M6 目標 | M9 目標 | M12 目標 |
|------|--------|--------|---------|
| MAU | 5K | 15K | 30K |
| 付費用戶 | 400 | 1,700 | 3,750 |
| 轉換率 | 8% | 11% | 12.5% |
| MRR | 120K | 495K | 1.13M |
| 水晶營收/月 | 50K | 450K | 1M |
| 總營收/月 | 170K | 945K | 2.13M |
| Monthly Burn | 650K | 800K | 950K |
| Net | -480K | **+145K** | **+1.18M** |

**Break-even: Month 9**

---

## 單位經濟模型

| 指標 | 數值 | 備註 |
|------|------|------|
| Organic CAC | NT$20~50 | 社群內容引流 |
| Paid CAC | NT$100~200 | Meta/TikTok 投放 |
| Blended CAC | NT$50~80 | 70/30 有機/付費混合 |
| LTV (12 個月) | NT$1,500~3,000 | 訂閱 + 水晶購買 |
| LTV : CAC | > 5x | 健康指標 |
| Payback Period | 2~4 個月 | 快速回本 |
| ARPU (blended) | ~NT$450/月 | 訂閱 + 電商 + 市集 |
| Monthly Burn | NT$500~700K | 3-4 人工程團隊為主 |
| Runway | 20~25 個月 | 以 NT$15M 種子輪計算 |

---

## 跨 Agent 決策流程

當五位專家的建議產生衝突時，PM 使用以下決策框架：

### 衝突解決矩陣

```
      高 ┌─────────────────────────┐
用     │  優先用戶體驗     │  最高優先 │
戶     │  （心理/客服建議）  │  （全員共識）│
影     ├─────────────────────────┤
響     │  延後處理         │  優先技術   │
      │  （降低優先級）     │  （技術/數據建議）│
   低 └─────────────────────────┘
         低              高
              技術風險
```

### 典型衝突場景

**場景 1：技術債 vs 用戶留存**
- 技術專家：「DAL 需要重構，否則未來擴展會有問題」
- 客服 Agent：「不活躍用戶正在流失，需要加強關懷機制」
- **PM 裁決**：短期先投入關懷機制（用戶可見價值），技術債安排在下個 sprint 的 20% buffer 中

**場景 2：功能複雜度 vs 塔羅深度**
- 塔羅專家：「應該加入 Celtic Cross 十張牌陣，提供更深入的解讀」
- 心理學專家：「太複雜的牌陣可能讓新用戶感到 overwhelmed」
- **PM 裁決**：先以 A/B 測試在 Premium 用戶中試行，收集數據後決定是否全量推出

**場景 3：數據收集 vs 隱私**
- 數據專家：「收集更多行為數據可以改善記憶品質」
- 心理學專家：「過多的數據收集可能讓用戶感到被監控」
- **PM 裁決**：採用漸進式授權（progressive permission），用戶明確看到數據帶來的好處後再請求更多權限

---

## 迭代節奏

### Sprint 結構（2 週 / Sprint）

```
Week 1:
  Mon  — Sprint Planning + RICE 重新評估
  Tue-Thu — Development
  Fri  — 內部 Demo + 技術審查

Week 2:
  Mon-Wed — Development + QA
  Thu  — Staging 部署 + 驗收
  Fri  — Sprint Review + Retro + 數據分析
```

### 迭代決策循環

```
┌──────────────────────────────────────────┐
│  1. 定義假設                              │
│     "加入主動關懷後，D7 留存會從 20% 提升到 28%"│
│                                          │
│  2. 最小化實作                             │
│     Sprint 內完成核心功能，跳過 nice-to-have  │
│                                          │
│  3. 數據收集                              │
│     上線後 2 週內收集足夠樣本量              │
│                                          │
│  4. 評估結果                              │
│     達標 → 擴展功能  /  未達標 → Pivot 或放棄 │
│                                          │
│  5. 更新 RICE 評分                         │
│     根據實際數據調整所有 feature 的優先級     │
└──────────────────────────────────────────┘
```

### 發布節奏

- **每 Sprint** — 至少一次生產環境部署
- **每月** — 一次 feature 回顧 + RICE 重新評分
- **每季** — 一次產品策略回顧 + 路線圖更新

---

## GTM 策略概覽

### 四階段上市策略

| 階段 | 時間 | 目標 | 支出 | 營收 |
|------|------|------|------|------|
| **A: 預備期** | M0~3 | 500 followers | NT$1.8M | NT$0 |
| **B: MVP 上線** | M4~6 | 5K MAU / 400 付費 | NT$1.9M | NT$230K |
| **C: 水晶 + KOL** | M7~9 | 15K MAU | NT$2.1M | NT$1.7M |
| **D: 規模化** | M10~12 | 30K MAU | NT$2.4M | NT$4.5M+ |

### 成長漏斗

```
AI 內容引流 (TikTok/IG/Threads)
     ↓
SEO 長尾關鍵字 (Blog)
     ↓
Free Trial (每日 3 次免費)
     ↓
Premium 轉換 (NT$299/月)
     ↓
水晶推薦 (Non-intrusive 解讀後推薦)
```

### 成長飛輪

```
Memory 品質提升
     ↓
Retention 提高（用戶黏性增強）
     ↓
口碑傳播增加 (NPS ↑)
     ↓
新用戶獲取成本降低 (Organic CAC ↓)
     ↓
更多用戶數據
     ↓
Memory 品質進一步提升 ← 回到起點
```

> 更多細節請參考 `references/gtm-playbook.md`

---

## 技術架構概覽（PM 視角）

### 微服務地圖

| 服務 | 技術 | 埠號 | 狀態 | PM 關注重點 |
|------|------|------|------|------------|
| TarotReading | Node.js + TS + Claude AI | 3000 | MVP 完成 | 解讀品質、回應速度 |
| CustomerManagement | Node.js + 6 Storage | 3010 | 設計完成 | 記憶深度、360 視圖 |
| CaringService | Python + FastAPI | 3020 | 設計中 | 觸達率、CTR、用戶感受 |
| ShoppingCart | Shopify Headless | 3030 | 設計完成 | 轉化率、AOV |
| TarotistScheduler | Node.js + TS | 3040 | 未開始 | 供給端品質、評價分數 |
| DAL | Go + gRPC | 4000 | 未開始 | P95 延遲、快取命中率 |

### WBS 對照（9 Phases / 53 Tasks）

| Phase | 週次 | 里程碑 | PM 驗收標準 |
|-------|------|--------|------------|
| P0 Scaffolding | W1~2 | M0 | `make up` 所有容器 healthy |
| P1 DAL Core | W3~5 | M1 | gRPC CRUD + Cache + Streaming 通過 |
| P2 Customer Core | W6~7 | M2 | 客戶 360 視圖 API 完整 |
| P3 Advanced Engines | W8~11 | M3 | 四種引擎並行上線 |
| P4 Caring Service | W12~13 | M4 | 關懷規則引擎上線 |
| P5 TarotReading 整合 | W14~15 | M5 MVP | **MVP Launch** 🚀 |
| P6 Shopping Cart | W16~18 | M6 | 水晶電商上線 |
| P7 Tarotist Scheduler | W19~20 | M7 | 塔羅師市集 Beta |
| P8 Analytics + E2E | W21~22 | M8 | 全平台整合測試通過 |

---

## 反模式（Anti-Patterns）

以下是產品開發中必須避免的常見陷阱：

### 1. 過度設計 (Over-Engineering)
- **症狀**：為 1,000 用戶設計能支撐 1,000,000 用戶的架構
- **解法**：YAGNI 原則 — 只建造現在需要的，相信未來可以重構

### 2. 忽視數據 (Data Ignorance)
- **症狀**：「我覺得用戶會喜歡」而不是「數據顯示用戶需要」
- **解法**：每個 feature 都要有可量化的假設和驗證計劃

### 3. 功能堆積 (Feature Creep)
- **症狀**：每個 sprint 都加新功能，但核心循環還沒打磨好
- **解法**：70% 精力在核心循環打磨，30% 在新功能探索

### 4. 缺乏聚焦 (Lack of Focus)
- **症狀**：同時追三個市場、五個用戶群、十個功能
- **解法**：一次只聚焦一個核心用戶群（小雨 25F），等跑通再擴展

### 5. 技術債忽視 (Tech Debt Neglect)
- **症狀**：永遠在趕新功能，從不還技術債
- **解法**：每個 sprint 保留 20% 容量給技術債和基礎設施

### 6. 過早規模化 (Premature Scaling)
- **症狀**：產品還沒 PMF 就開始大量投放
- **解法**：先確認 D7 ≥ 28% + 轉換率 ≥ 4%，再加大獲客投入

### 7. 競品模仿 (Copycat Syndrome)
- **症狀**：看到競品做什麼就跟著做
- **解法**：回歸自身差異化（記憶 + 關懷 + 數據飛輪），做別人無法複製的

---

## 投資人溝通要點

### Elevator Pitch (30 秒版)

> TarotFriend 是 AI 驅動的塔羅生活平台。我們用三層記憶系統讓 AI 真正「記住」每位使用者，
> 加上主動關懷引擎在情緒低落時主動觸達，再結合水晶電商變現。台灣身心靈市場 50 億，
> 我們第三年目標 1 億 ARR，Month 9 損益平衡。

### Key Metrics to Highlight

1. **市場規模**：TAM NT$500 億+，CAGR 18%+
2. **單位經濟**：LTV:CAC > 5x，Payback 2~4 個月
3. **技術護城河**：6 種儲存引擎、三層記憶、主動關懷
4. **進度**：TarotReading MVP 完成，66KB 架構文件，53 個 WBS 任務
5. **財務**：種子輪 NT$15M，月燃率 NT$500~700K，Runway 20~25 個月

### Seed Round Ask

- **金額**：NT$15,000,000
- **用途**：工程團隊 (55%) + 行銷 (15%) + 基礎設施 (7%) + AI API (5%) + 營運 (13%) + Buffer (5%)
- **里程碑**：12 個月內達成 30K MAU、月營收 NT$2M+、Month 9 損益平衡

---

## 參考資料

- `references/market-analysis.md` — TAM/SAM/SOM 詳細分析、競品矩陣、台灣市場洞察、定價基準
- `references/user-personas.md` — 四大使用者畫像、JTBD、使用者旅程地圖、痛點/增益對照
- `references/prioritization-frameworks.md` — RICE 評分模板、MoSCoW 分類、Feature 矩陣、A/B 測試、反饋迴圈
- `references/gtm-playbook.md` — GTM 四階段詳細計劃、漏斗指標、頻道策略、KOL/內容、成長飛輪、Launch Checklist
