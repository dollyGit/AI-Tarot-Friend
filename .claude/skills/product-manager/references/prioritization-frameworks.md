# Prioritization Frameworks — TarotFriend 優先級框架

> PM 參考資料：RICE 評分模板、MoSCoW 分類、Feature 矩陣、A/B 測試策略、反饋迴圈

---

## RICE 評分模板

### 公式

```
RICE Score = (Reach × Impact × Confidence) / Effort
```

### 評分標準

| 維度 | 定義 | 評分等級 |
|------|------|---------|
| **Reach** | 每季度受影響的用戶數 | 30K=3.0 / 10K=1.0 / 5K=0.5 / 1K=0.1 |
| **Impact** | 對 North Star Metric (WAR) 的影響 | Massive=3 / High=2 / Medium=1 / Low=0.5 / Minimal=0.25 |
| **Confidence** | 團隊對估計的信心程度 | High=100% / Medium=80% / Low=50% |
| **Effort** | 所需人週數 | 1W=1 / 2W=2 / 1M=4 / 2M=8 / 1Q=16 |

### 評分範例

| Feature | R | I | C | E | RICE | 優先級 |
|---------|---|---|---|---|------|--------|
| 基礎塔羅解讀（單張/三張） | 3.0 | 3 | 100% | 4 | **225** | Must |
| 情緒分析整合 | 3.0 | 2 | 80% | 2 | **240** | Must |
| 三層記憶系統 | 1.0 | 3 | 80% | 8 | **30** | Should |
| Premium 訂閱機制 | 0.5 | 3 | 100% | 2 | **75** | Should |
| 主動關懷 v1（基礎規則） | 1.0 | 2 | 80% | 4 | **40** | Should |
| 水晶 AI 推薦 | 0.5 | 2 | 50% | 8 | **6.3** | Could |
| Celtic Cross 十張牌陣 | 0.3 | 1 | 80% | 2 | **12** | Could |
| 塔羅師市集 | 0.1 | 2 | 50% | 16 | **0.6** | Won't (MVP) |
| AR 牌面展示 | 0.1 | 0.5 | 50% | 8 | **0.3** | Won't (MVP) |

---

## MoSCoW 分類

### MVP 階段（Phase 0~5, W1~W15）

#### Must Have（必做）

| Feature | 理由 | WBS Phase |
|---------|------|-----------|
| 基礎塔羅解讀（單張/三張） | 核心產品，沒有這個就沒有產品 | P5 |
| 用戶帳號 + LINE Login | 入口，無法省略 | P2 |
| 情緒分析 | 差異化核心，從第一天就需要 | P5 |
| 免費額度機制（每日 3 次） | 轉化漏斗入口 | P5 |
| 命理建檔（星座/生肖/五行） | 個人化基礎 | P2 |
| DAL Core + Cache | 所有服務的基礎 | P1 |
| Docker Compose + CI/CD | 開發/部署基礎 | P0 |

#### Should Have（應做）

| Feature | 理由 | WBS Phase |
|---------|------|-----------|
| 三層記憶系統 | 差異化第二支柱，但初版可簡化 | P3 |
| 主動關懷 v1（不活躍/情緒下降） | 差異化第三支柱，但規則可簡化 | P4 |
| Premium 訂閱 | 第一收入柱，需在 M4 上線 | P5 |
| 危機偵測 + 資源引導 | 安全必要，但觸發率低 | P5 |
| 七張牌陣 | 擴充解讀選擇 | P5 |

#### Could Have（可做）

| Feature | 理由 | WBS Phase |
|---------|------|-----------|
| 水晶電商推薦 | 第二收入柱，但 M6 才需要 | P6 |
| Celtic Cross 十張牌陣 | 專業玩家需求，非 MVP 必要 | P5 (post-MVP) |
| Email/SMS 關懷 | LINE 優先，其他通路可後補 | P4 (post-MVP) |
| 多語言支援 | Jenny persona 需求，但初期可只做中文 | P5 (post-MVP) |
| 分享卡片功能 | 社群傳播，但非核心功能 | P5 (post-MVP) |

#### Won't Have（本期不做）

| Feature | 理由 | 預計 Phase |
|---------|------|-----------|
| 塔羅師市集 | 供給端建設太重，M19~20 再做 | P7 |
| AR 牌面展示 | 技術炫酷但用戶價值不明確 | Backlog |
| 社交功能 | 不是核心循環的一部分 | Backlog |
| 多平台 App (iOS/Android) | 先 Web/PWA，驗證 PMF 後再做 | Backlog |
| AI 語音解讀 | 高成本、低優先級 | Backlog |

---

## TarotFriend Feature Matrix

### 全部 WBS Features × RICE 評分

| WBS | Feature | Must/Should/Could/Won't | RICE | Sprint |
|-----|---------|------------------------|------|--------|
| P0.1 | Root Config | Must | N/A (infra) | S1 |
| P0.2 | Docker Compose | Must | N/A (infra) | S1 |
| P0.3 | Shared Protobuf | Must | N/A (infra) | S1 |
| P0.4 | Shared TypeScript | Must | N/A (infra) | S1 |
| P0.5 | Service Template | Must | N/A (infra) | S1 |
| P0.6~11 | Scaffold Services | Must | N/A (infra) | S1~2 |
| P1.1 | Storage Router | Must | N/A (infra) | S2~3 |
| P1.2 | gRPC CRUD | Must | N/A (infra) | S3 |
| P1.3 | Cache Manager | Must | N/A (infra) | S3~4 |
| P1.4 | Streaming Pipeline | Should | N/A (infra) | S4~5 |
| P1.5 | Observability | Should | N/A (infra) | S5 |
| P2.1 | Customer CRUD | Must | 180 | S6 |
| P2.2 | Contact & Birth Chart | Must | 150 | S6 |
| P2.3 | Tag System | Could | 40 | S7 |
| P2.4 | KV Session | Must | 120 | S7 |
| P2.5 | Kafka Events | Should | 80 | S7 |
| P3.1 | MongoDB Engine | Should | 45 | S8~9 |
| P3.2 | InfluxDB Engine | Should | 35 | S8~9 |
| P3.3 | Qdrant Engine | Should | 50 | S9~10 |
| P3.4 | Neo4j Engine | Could | 25 | S10~11 |
| P3.5 | Cross-Engine Aggregation | Could | 20 | S11 |
| P4.1 | Caring Kafka Consumer | Should | 60 | S12 |
| P4.2 | Emotion Tracking | Should | 55 | S12 |
| P4.3 | Rule Engine | Should | 65 | S13 |
| P4.4 | Caring Actions | Should | 50 | S13 |
| P5.x | TarotReading DAL Integration | Must | 225 | S14~15 |
| P6.x | Shopping Cart | Could | 30 | S16~18 |
| P7.x | Tarotist Scheduler | Won't (MVP) | 5 | S19~20 |
| P8.x | Analytics + E2E | Should | 40 | S21~22 |

---

## A/B 測試策略

### 測試框架

```
1. 定義假設
   "我們相信 [改變 X] 會導致 [指標 Y] 從 [基線] 提升到 [目標]"

2. 設計實驗
   - 控制組 (50%): 現有體驗
   - 實驗組 (50%): 含改變 X
   - 最小樣本量: 根據效果量和統計功效計算

3. 執行
   - 隨機分配用戶
   - 跑滿預定時間（通常 2 週）
   - 不中途偷看結果做決策

4. 分析
   - 統計顯著性 p < 0.05
   - 實際效果量 (effect size)
   - 二階效應（是否影響其他指標）

5. 決策
   - 顯著正向 → 全量推出
   - 無顯著差異 → 繼續迭代或放棄
   - 顯著負向 → 回滾
```

### 預定 A/B 測試清單

| 假設 | 控制 | 實驗 | 目標指標 | 預計時間 |
|------|------|------|---------|---------|
| 首次解讀引導會提高完成率 | 無引導 | 步驟式引導 | 首次解讀完成率 | M4 |
| 每日運勢推播提高 D7 | 無推播 | 每日 08:00 推播 | D7 留存率 | M4~5 |
| 解讀後水晶推薦不影響滿意度 | 無推薦 | 解讀後推薦 1 顆水晶 | 解讀滿意度 | M6 |
| Premium 首月半價提高轉化率 | NT$299 | NT$149 首月 | Premium 轉化率 | M5 |
| 主動關懷提高回訪率 | 無關懷 | 不活躍 3 天後 LINE | 7 日回訪率 | M5~6 |
| Celtic Cross 提高 Premium 續訂 | 只有 1/3/7 張 | 加入 Celtic Cross | Premium 續訂率 | M7+ |

### 最小樣本量計算

| 基線轉化率 | 期望提升 | 統計功效 | 每組最小樣本 |
|-----------|---------|---------|------------|
| 5% | +2% (相對 40%) | 80% | ~1,500 |
| 10% | +2% (相對 20%) | 80% | ~3,000 |
| 28% | +4% (相對 14%) | 80% | ~3,500 |
| 4% | +1% (相對 25%) | 80% | ~5,000 |

**含義**：MAU 達到 5K+ 後，大部分 A/B 測試才有意義。MVP 階段以定性反饋為主。

---

## 反饋迴圈

### 三種反饋來源

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   定量數據    │    │   定性回饋    │    │   行為分析    │
│  (Metrics)   │    │ (Interviews) │    │ (Analytics)  │
│              │    │              │    │              │
│ MAU, D7,     │    │ 用戶訪談     │    │ 點擊熱圖     │
│ 轉化率,      │    │ 客服回報     │    │ 漏斗分析     │
│ ARPU, NPS    │    │ 社群反饋     │    │ Session 錄影  │
│ CTR, Churn   │    │ App Store 評論│   │ 事件追蹤     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                   ┌──────▼──────┐
                   │  PM 決策     │
                   │  (RICE 更新)  │
                   └─────────────┘
```

### 定量指標追蹤（週報）

| 類別 | 指標 | 目標 | 追蹤頻率 |
|------|------|------|---------|
| **Acquisition** | 新用戶註冊數 | 持續成長 | Daily |
| **Activation** | 首次解讀完成率 | ≥ 70% | Weekly |
| **Retention** | D1 / D7 / D30 | 50% / 28% / 15% | Weekly |
| **Revenue** | MRR / ARPU / Conversion | 見財務目標 | Weekly |
| **Referral** | 分享率 / 推薦碼使用 | ≥ 5% / ≥ 3% | Monthly |

### 定性反饋收集

| 方法 | 頻率 | 對象 | 目的 |
|------|------|------|------|
| 用戶深度訪談 | 2 次/月 | 5~8 人/次 | 理解未被量化的需求 |
| 客服回報彙整 | 每週 | 所有客服互動 | 識別常見問題和痛點 |
| App Store 評論 | 每日 | 所有評論 | 快速回應負面評論 |
| 社群聆聽 | 持續 | FB/IG/Threads 提及 | 品牌情感分析 |
| NPS 調查 | 每月 | 隨機 10% 用戶 | 忠誠度追蹤 |

### 行為分析工具

| 工具類型 | 用途 | 建議工具 |
|---------|------|---------|
| 產品分析 | 事件追蹤、漏斗、留存 | Mixpanel / Amplitude |
| 熱圖 | 點擊/滾動行為 | Hotjar / Microsoft Clarity |
| Session 錄影 | 理解用戶操作流程 | Hotjar / FullStory |
| A/B 測試 | 實驗管理 | GrowthBook / LaunchDarkly |
| 錯誤追蹤 | 前端/API 錯誤 | Sentry |
| APM | 效能監控 | Jaeger + Grafana |

---

## 技術 vs 產品債務管理

### 債務分類

| 類型 | 定義 | 範例 |
|------|------|------|
| **技術債 (Tech Debt)** | 為了趕進度而做的技術捷徑 | 跳過測試、硬編碼、缺少索引 |
| **產品債 (Product Debt)** | 為了趕上線而省略的 UX 改善 | 缺少 onboarding、錯誤訊息不友善 |
| **設計債 (Design Debt)** | 不一致的 UI 元素和互動模式 | 按鈕風格不統一、間距不規範 |

### 債務管理策略

```
每個 Sprint 的時間分配：

┌────────────────────────────────────────┐
│ 70% — 新功能開發                        │
│ 20% — 技術債 + 產品債                    │
│ 10% — 探索性工作 (spike / prototype)     │
└────────────────────────────────────────┘
```

### 債務評分

| 維度 | 1 (低) | 3 (中) | 5 (高) |
|------|--------|--------|--------|
| 影響範圍 | 單一功能 | 跨功能 | 全平台 |
| 發生頻率 | 偶爾 | 每週 | 每天 |
| 修復成本 | < 1 天 | 1~3 天 | > 1 週 |
| 用戶可見度 | 不可見 | 偶爾可見 | 總是可見 |

**決策規則**：
- 總分 ≥ 15 → 下個 Sprint 必須處理
- 總分 10~14 → 排入近期 backlog
- 總分 < 10 → 記錄但不急迫

---

## 決策日誌模板

每個重大產品決策都應記錄：

```markdown
## 決策: [決策標題]
**日期**: YYYY-MM-DD
**決策者**: PM
**參與者**: [相關 Agent/專家]

### 背景
[為什麼需要這個決策？]

### 選項
1. [選項 A] — 優點: ... / 缺點: ...
2. [選項 B] — 優點: ... / 缺點: ...
3. [選項 C] — 優點: ... / 缺點: ...

### 決策
選擇 [選項 X]，因為 [理由]

### RICE 評分
R: [X] / I: [X] / C: [X]% / E: [X] = [RICE Score]

### 成功指標
[如何衡量這個決策是否正確？]

### 回顧日期
[何時回來評估這個決策的效果？]
```
