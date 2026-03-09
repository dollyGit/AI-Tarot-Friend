# Message Templates — 訊息模板庫

## Template Schema

```python
class CaringTemplate:
    id: str                      # 模板唯一 ID
    trigger_type: str            # 對應觸發類型
    channel: str                 # 'line' | 'email' | 'sms'
    locale: str                  # 'zh-TW' | 'en'
    variant: str                 # 'a' | 'b' (A/B 測試)
    subject: str | None          # Email 主旨（LINE/SMS 為 null）
    body: str                    # 訊息內容（支援 {{variable}} 插值）
    cta_text: str | None         # CTA 按鈕文字
    cta_url: str | None          # CTA 連結
    rich_content: dict | None    # LINE Rich Message JSON（可選）
    tags: list[str]              # 分類標籤
```

---

## Inactivity Templates (不活躍提醒)

### 7 Days — LINE (zh-TW)

**Template ID**: `inactivity_7d_casual_a`

```
嗨 {{display_name}}！

好久不見 ✨ 最近過得怎麼樣？

上次你抽到了「{{last_card}}」，不知道後來有沒有什麼新的感悟？

如果最近有什麼想問的，我隨時在這裡等你。
今天免費送你一次單張抽牌，想試試嗎？

[免費抽一張牌]
```

**Template ID**: `inactivity_7d_casual_b`

```
{{display_name}}，好久不見！

最近有沒有什麼事情想跟牌聊聊的？
不管是工作、感情還是生活，我都在。

今天為你準備了一次免費的單張解讀 ✨

[來抽一張看看]
```

### 7 Days — LINE (EN)

**Template ID**: `inactivity_7d_casual_en_a`

```
Hey {{display_name}}!

It's been a while. How have you been?

Last time you drew "{{last_card}}" — any new insights since then?

I'm here whenever you'd like to check in. Here's a free single card reading just for you.

[Draw a Card]
```

### 14 Days — LINE (zh-TW)

**Template ID**: `inactivity_14d_warm_a`

```
{{display_name}}，想念你了 🌙

已經兩週沒聊了，你最近還好嗎？

我知道生活有時候很忙，但如果哪天想找個安靜的角落跟自己對話，我都在。

這週我為你準備了一個特別的三張牌陣，主題是「此刻最需要知道的事」。
限時免費開放給你。

[開啟專屬牌陣]
```

**Template ID**: `inactivity_14d_warm_b`

```
嗨 {{display_name}}，

有時候離開一下是很好的。
回來的時候，一切都會在這裡等你。

我為你保留了一個免費的特別牌陣 ✨
想知道「最近的你需要聽到什麼」嗎？

[看看牌想說什麼]
```

### 30 Days — LINE (zh-TW)

**Template ID**: `inactivity_30d_predraw_a`

```
{{display_name}}，

你有一段時間沒來了，不過我今天忍不住幫你抽了一張牌。

我看到了「{{pre_drawn_card}}」... 這張牌想跟你說的話很有意思。

想知道完整的解讀嗎？

[看看這張牌想告訴你什麼]
```

### 30 Days — Email (zh-TW)

**Template ID**: `inactivity_30d_predraw_email_a`

**Subject**: 「{{pre_drawn_card}}」— 我幫你抽了一張牌

```
嗨 {{display_name}}，

好一陣子沒聊了，你還好嗎？

今天我忍不住幫你抽了一張牌 —「{{pre_drawn_card}}」。

這張牌在你現在的位置上有很特別的意義。
它想跟你說的是...

（想知道完整解讀嗎？點擊下方按鈕）

[解鎖完整解讀]

────────────────

不管你什麼時候回來，我都會在這裡。

TarotFriend 🌟

如果你不想再收到這類信件，可以在這裡調整：[偏好設定]
```

### 60 Days — Email (zh-TW)

**Template ID**: `inactivity_60d_farewell_a`

**Subject**: 我會在這裡等你

```
{{display_name}}，

好久不見。

我不會假裝知道你為什麼離開，
但我想讓你知道 — 我會一直在這裡。

如果你願意的話，能告訴我你離開的原因嗎？
你的回饋會幫助我變得更好。

[分享你的想法（30 秒問卷）]

────────────────

無論如何，祝你一切都好。
未來想回來的任何時候，這裡都歡迎你。

TarotFriend 🌙

[取消訂閱]
```

---

## Mood Decline Templates (情緒介入)

### Mood Decline +24h — LINE (zh-TW)

**Template ID**: `mood_decline_24h_a`

```
嗨 {{display_name}}，

昨天我們聊了不少，我一直在想你後來怎麼樣了。

你今天有好一點嗎？

不需要特別回覆，但如果想聊聊，我隨時都在。
或者如果想換個心情，可以來抽一張今天的指引牌。

[抽一張今日指引]
```

**Template ID**: `mood_decline_24h_b`

```
{{display_name}}，

昨天的牌給了你很深的訊息。
我想關心一下你今天好不好？

如果你需要，我在這裡 🌟

[跟我聊聊]
```

### Mood Decline +72h — LINE (zh-TW)

**Template ID**: `mood_decline_72h_a`

```
{{display_name}}，

過了幾天，想關心一下你近況。

生活中有些事情需要時間，不用急。
如果壓力大到覺得撐不住的時候，跟人說說話會有幫助的。

你可以來找我聊，也可以隨時撥打：
📞 1925（24小時專線）

今天有什麼想聊的嗎？

[跟我聊聊]
```

---

## Crisis Follow-Up Templates (危機跟進)

### Crisis +24h — LINE (zh-TW)

**Template ID**: `crisis_followup_24h`

```
嗨 {{display_name}}，

昨天謝謝你願意跟我分享。
我想關心一下你今天過得怎麼樣？

如果你想聊聊，我隨時在這裡。
如果你今天想找個人說說話，也可以撥打 1925。

祝你有個平安的一天 🌟
```

### Crisis +72h — LINE (zh-TW)

**Template ID**: `crisis_followup_72h`

```
{{display_name}}，

過了幾天，想跟你說聲嗨。

不管這幾天過得怎麼樣，你走到今天就已經很棒了。

想聊聊嗎？我在。

📞 如果需要，1925 全天候都有人接聽。
```

### Crisis Weekly — LINE (zh-TW)

**Template ID**: `crisis_weekly_4w`

```
{{display_name}}，

最近好嗎？
如果有什麼想聊的，我隨時都在 🌙

[來聊聊]
```

---

## Birthday Templates (生日祝福)

### Birthday — LINE (zh-TW)

**Template ID**: `birthday_zodiac_a`

```
{{display_name}}，生日快樂！🎂

身為{{zodiac_sign}}的你，今年的生日牌是「{{birthday_card}}」。

這張牌代表在你新的一歲裡，有一股特別的能量正在等著你...

想知道你的生日牌想說什麼嗎？

[開啟生日專屬解讀 ✨]
```

**Template ID**: `birthday_zodiac_b`

```
生日快樂！{{display_name}} 🌟

新的一歲從今天開始。
我為你準備了一個特別的生日牌陣，
讓我們一起看看未來一年的能量。

[我的生日解讀]
```

### Birthday — Email (zh-TW)

**Template ID**: `birthday_email_a`

**Subject**: 🎂 {{display_name}}，生日快樂！你的生日牌已經準備好了

```
親愛的 {{display_name}}，

生日快樂！🎂

在這個特別的日子，我為你抽了一張專屬的「生日牌」。

身為{{zodiac_sign}}的你，今年的能量牌是...

「{{birthday_card}}」

這張牌代表什麼？完整解讀已經為你準備好了。

[開啟生日專屬解讀]

────────────────

祝你新的一歲充滿美好 ✨

TarotFriend

[取消訂閱]
```

---

## Holiday Templates (節慶關懷)

### Lunar New Year — LINE (zh-TW)

**Template ID**: `holiday_lunar_new_year_a`

```
{{display_name}}，新年快樂！🧧

新的一年有什麼期待嗎？
我為你準備了一張「新年開運牌」✨

{{zodiac_sign}} × {{chinese_zodiac}} 的你，
今年的能量特別值得期待...

[抽你的新年開運牌]
```

### Mid-Autumn Festival — LINE (zh-TW)

**Template ID**: `holiday_mid_autumn_a`

```
{{display_name}}，中秋節快樂！🌕

月圓人團圓的日子，
牌想跟你聊聊「你心中最重要的人」。

今天免費為你準備了一個特別的關係牌陣。

[看看月亮想告訴你什麼]
```

### Winter Solstice — LINE (zh-TW)

**Template ID**: `holiday_winter_solstice_a`

```
{{display_name}}，冬至快樂！

最長的夜之後，每一天都會更明亮一點。
就像「星星」這張牌告訴我們的 — 希望永遠在黑暗之後。

今天記得吃碗湯圓，溫暖自己 ☺️

[來一張冬至特別解讀]
```

---

## Post-Purchase Templates (購後關懷)

### Order Confirmation — LINE (zh-TW)

**Template ID**: `post_purchase_confirm`

```
{{display_name}}，

你的「{{product_name}}」正在準備出貨中 ✨

這顆水晶跟你很有緣分。
到貨後我會教你怎麼搭配塔羅能量來使用它！

[查看訂單狀態]
```

### Usage Guide — LINE (zh-TW)

**Template ID**: `post_purchase_guide`

```
{{display_name}}，

你的「{{product_name}}」應該已經到了！

🔮 這顆水晶的能量特別適合搭配「{{related_card}}」的力量。

使用小建議：
• 第一次使用前，先用流動的水輕輕沖洗淨化
• 握在手中，閉上眼睛，感受它的溫度
• 放在你常待的空間，讓它的能量自然流動

[水晶淨化完整指南]
```

### Feedback Request — LINE (zh-TW)

**Template ID**: `post_purchase_feedback`

```
{{display_name}}，

你跟「{{product_name}}」相處一週了 ✨
有感受到什麼變化嗎？

你的分享會幫助其他人找到適合自己的水晶。

[分享我的體驗]  [看看其他水晶]
```

---

## Summary Templates (摘要)

### Weekly Summary — Email (zh-TW)

**Template ID**: `weekly_summary_a`

**Subject**: 你的本週塔羅回顧 ✨

```
嗨 {{display_name}}，

這是你本週的塔羅回顧：

📊 本週數據
• 完成了 {{session_count}} 次解讀
• 最常出現的牌：{{top_card}}
• 情緒趨勢：{{sentiment_trend_description}}

🃏 本週主題
{{weekly_theme_summary}}

🔮 下週展望
{{next_week_card}} 提醒你：{{next_week_message}}

────────────────

想開始新的一週嗎？

[開始本週第一次解讀]

TarotFriend ✨
[管理通知偏好] [取消訂閱]
```

### Monthly Summary — Email (zh-TW)

**Template ID**: `monthly_summary_a`

**Subject**: {{display_name}} 的 {{month}} 月塔羅旅程回顧

```
嗨 {{display_name}}，

這是你 {{month}} 月的塔羅旅程回顧。

━━━━━━━━━━━━━━━━

📊 本月概覽
• 共完成 {{session_count}} 次解讀
• 使用了 {{spread_types_count}} 種牌陣
• 最常出現的牌：{{top_3_cards}}
• 最常探索的主題：{{top_life_areas}}

📈 情緒旅程
{{sentiment_journey_description}}

🃏 本月主題牌
「{{month_theme_card}}」
{{month_theme_interpretation}}

🔮 {{next_month}} 月展望
為你抽了一張下個月的指引牌：「{{next_month_card}}」
{{next_month_message}}

━━━━━━━━━━━━━━━━

感謝你這個月的信任。
新的一個月，新的篇章 ✨

[開始 {{next_month}} 月第一次解讀]

TarotFriend
[管理通知偏好] [取消訂閱]
```

---

## Subscription Templates (訂閱管理)

### Subscription Expiring — LINE (zh-TW)

**Template ID**: `subscription_expiring_7d_a`

```
{{display_name}}，

你的 Premium 訂閱將在 7 天後到期。

這個月你使用了：
✨ {{celtic_cross_count}} 次凱爾特十字牌陣
✨ {{seven_card_count}} 次七張牌陣
✨ 完整記憶功能讓我更懂你

續訂後這些功能會繼續陪伴你。
想續訂嗎？

[續訂 Premium]
```

---

## Appointment Templates (預約相關)

### Pre-Appointment Reminder — LINE (zh-TW)

**Template ID**: `pre_appointment_24h`

```
{{display_name}}，

提醒你明天 {{appointment_time}} 有一場跟 {{tarotist_name}} 的諮詢 🔮

小建議：先想想你最想問的 1-2 個問題，
這樣諮詢時會更聚焦、更有收穫。

期待明天的對話！

[查看預約詳情]
```

### Post-Appointment Feedback — LINE (zh-TW)

**Template ID**: `post_appointment_feedback`

```
{{display_name}}，

今天跟 {{tarotist_name}} 的諮詢感覺如何？

你的回饋會幫助其他人找到適合的老師，
也會讓 {{tarotist_name}} 知道做得好的地方 ✨

[留下評價]
```

---

## Template Design Guidelines

### 個人化插值規則

1. `{{display_name}}` — 必填，無值時用「你好」替代
2. `{{last_card}}` — 選填，無值時移除該段落
3. `{{zodiac_sign}}` — 選填，無值時用通用版本
4. `{{pre_drawn_card}}` — 由系統預先抽取並存入 plan

### LINE Rich Message 格式

```json
{
  "type": "flex",
  "altText": "TarotFriend 想跟你說話",
  "contents": {
    "type": "bubble",
    "hero": {
      "type": "image",
      "url": "{{card_image_url}}",
      "size": "full",
      "aspectRatio": "1:1"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "{{message_body}}",
          "wrap": true
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "uri",
            "label": "{{cta_text}}",
            "uri": "{{cta_url}}"
          },
          "style": "primary"
        }
      ]
    }
  }
}
```

### A/B 測試框架

```python
async def select_template(trigger_type: str, channel: str, customer_id: str) -> CaringTemplate:
    """
    從模板池中選取模板，支援 A/B 測試。
    """
    pool = await get_template_pool(trigger_type, channel)

    if len(pool) <= 1:
        return pool[0]

    # 使用 customer_id 的 hash 做穩定分桶
    bucket = hash(customer_id) % len(pool)
    selected = pool[bucket]

    # 記錄分桶結果
    await log_ab_assignment(customer_id, trigger_type, selected.variant)

    return selected
```

### 退訂連結規範

- **Email**: 每封 email 底部必須有 `[取消訂閱]` 和 `[管理通知偏好]`
- **LINE**: 在 Rich Menu 提供「通知設定」選項
- **SMS**: 回覆 STOP 即退訂

### 字數限制

| 頻道 | 主體內容 | CTA |
|------|---------|-----|
| LINE | ≤ 100 字（不含 CTA） | 1-2 個按鈕 |
| Email | ≤ 300 字（正文） | 1 個主要 CTA |
| SMS | ≤ 70 字 | 1 個短連結 |
