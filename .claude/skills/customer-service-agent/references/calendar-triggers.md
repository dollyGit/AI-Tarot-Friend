# Calendar Triggers — 台灣節慶日曆與塔羅牌聯想

## Overview

TarotFriend 的節慶觸發系統結合台灣在地文化（農曆/陽曆）與塔羅牌意象，
在節慶前 1-3 天自動建立關懷計畫，發送結合節日主題的塔羅訊息。

---

## Holiday Schema

```python
class HolidayTrigger:
    code: str                   # 節慶代碼（用於 trigger_type: holiday_{code}）
    name_zh: str                # 中文名稱
    name_en: str                # 英文名稱
    calendar_type: str          # 'solar' | 'lunar' | 'dynamic'
    month: int                  # 月份
    day: int                    # 日期（農曆需轉換）
    importance: str             # 'major' | 'minor' | 'cultural'
    tarot_card: str             # 關聯塔羅牌
    tarot_theme: str            # 塔羅主題方向
    template_ids: list[str]     # 對應模板 ID
    send_offset_days: int       # 提前幾天發送（0 = 當天）
    target_audience: str        # 'all' | 'active_30d' | 'all_including_inactive'
```

---

## Major Holidays (重大節日)

### 農曆新年 (Lunar New Year)

```json
{
  "code": "lunar_new_year",
  "name_zh": "農曆新年",
  "name_en": "Lunar New Year",
  "calendar_type": "lunar",
  "month": 1,
  "day": 1,
  "importance": "major",
  "tarot_card": "The World (世界)",
  "tarot_theme": "完成一個循環，新的開始。年度總結與新年展望。",
  "template_ids": ["holiday_lunar_new_year_a", "holiday_lunar_new_year_b"],
  "send_offset_days": 0,
  "target_audience": "all_including_inactive",
  "special_content": {
    "offer_type": "free_new_year_spread",
    "spread_name": "新年開運牌",
    "card_count": 3,
    "positions": ["過去一年", "新年能量", "新年祝福"],
    "zodiac_element": true,
    "chinese_zodiac_element": true
  }
}
```

**農曆新年延伸觸發**:

| 日期 | 觸發 | 內容 |
|------|------|------|
| 除夕 (農曆 12/30) | `lunar_new_year_eve` | 年度回顧 + 感謝 |
| 初一 | `lunar_new_year` | 新年開運牌 |
| 初五 (開工) | `lunar_new_year_work` | 工作運勢牌 |
| 元宵 (農曆 1/15) | `lantern_festival` | 許願牌 |

### 中秋節 (Mid-Autumn Festival)

```json
{
  "code": "mid_autumn",
  "name_zh": "中秋節",
  "name_en": "Mid-Autumn Festival",
  "calendar_type": "lunar",
  "month": 8,
  "day": 15,
  "importance": "major",
  "tarot_card": "The Moon (月亮)",
  "tarot_theme": "月圓人團圓。關係、直覺、家庭的深層連結。",
  "template_ids": ["holiday_mid_autumn_a", "holiday_mid_autumn_b"],
  "send_offset_days": 0,
  "target_audience": "all_including_inactive",
  "special_content": {
    "offer_type": "free_relationship_spread",
    "spread_name": "月圓關係牌",
    "card_count": 3,
    "positions": ["你的心", "重要的人", "連結的力量"]
  }
}
```

### 端午節 (Dragon Boat Festival)

```json
{
  "code": "dragon_boat",
  "name_zh": "端午節",
  "name_en": "Dragon Boat Festival",
  "calendar_type": "lunar",
  "month": 5,
  "day": 5,
  "importance": "major",
  "tarot_card": "Strength (力量)",
  "tarot_theme": "驅邪避凶，內在力量的展現。勇氣與堅韌。",
  "template_ids": ["holiday_dragon_boat_a"],
  "send_offset_days": 0,
  "target_audience": "active_30d",
  "special_content": {
    "offer_type": "free_single_card",
    "theme": "力量指引"
  }
}
```

---

## Solar Calendar Holidays (陽曆節日)

### 元旦 (New Year's Day)

```json
{
  "code": "new_year",
  "name_zh": "元旦",
  "name_en": "New Year's Day",
  "calendar_type": "solar",
  "month": 1,
  "day": 1,
  "importance": "major",
  "tarot_card": "The Fool (愚者)",
  "tarot_theme": "新的旅程開始。帶著勇氣與信任踏出第一步。",
  "template_ids": ["holiday_new_year_a"],
  "send_offset_days": 0,
  "target_audience": "all_including_inactive"
}
```

### 情人節 (Valentine's Day)

```json
{
  "code": "valentines",
  "name_zh": "情人節",
  "name_en": "Valentine's Day",
  "calendar_type": "solar",
  "month": 2,
  "day": 14,
  "importance": "major",
  "tarot_card": "The Lovers (戀人)",
  "tarot_theme": "愛的選擇與連結。不只是浪漫愛，也是自我之愛。",
  "template_ids": ["holiday_valentines_a", "holiday_valentines_b"],
  "send_offset_days": 1,
  "target_audience": "active_30d",
  "special_content": {
    "offer_type": "free_love_spread",
    "spread_name": "愛情能量牌",
    "card_count": 3,
    "positions": ["你的愛情能量", "對方的能量", "愛的方向"],
    "single_version": {
      "positions": ["你的愛情能量", "即將到來的邂逅", "如何準備自己"]
    }
  }
}
```

### 母親節 (Mother's Day)

```json
{
  "code": "mothers_day",
  "name_zh": "母親節",
  "name_en": "Mother's Day",
  "calendar_type": "dynamic",
  "rule": "second_sunday_of_may",
  "importance": "major",
  "tarot_card": "The Empress (皇后)",
  "tarot_theme": "母性的力量、滋養與無條件的愛。感謝與回饋。",
  "template_ids": ["holiday_mothers_day_a"],
  "send_offset_days": 1,
  "target_audience": "active_30d",
  "special_content": {
    "offer_type": "free_gratitude_spread",
    "spread_name": "感恩牌",
    "card_count": 1,
    "theme": "獻給最重要的人"
  },
  "sensitivity_note": "部分使用者可能與母親關係複雜或已失去母親，需要特別留意。若使用者 Neo4j 圖譜中母親關係 sentiment_avg < -0.3，改用通用感恩版本而非母親特定版本。"
}
```

### 父親節 (Father's Day)

```json
{
  "code": "fathers_day",
  "name_zh": "父親節",
  "name_en": "Father's Day",
  "calendar_type": "solar",
  "month": 8,
  "day": 8,
  "importance": "major",
  "tarot_card": "The Emperor (皇帝)",
  "tarot_theme": "父性的力量、結構與保護。責任與關懷。",
  "template_ids": ["holiday_fathers_day_a"],
  "send_offset_days": 1,
  "target_audience": "active_30d",
  "sensitivity_note": "同母親節，注意使用者與父親的關係動態。"
}
```

### 七夕 (Chinese Valentine's Day)

```json
{
  "code": "qixi",
  "name_zh": "七夕",
  "name_en": "Chinese Valentine's Day (Qixi)",
  "calendar_type": "lunar",
  "month": 7,
  "day": 7,
  "importance": "cultural",
  "tarot_card": "Two of Cups (聖杯二)",
  "tarot_theme": "靈魂伴侶、深層連結。牛郎織女的重逢。",
  "template_ids": ["holiday_qixi_a"],
  "send_offset_days": 0,
  "target_audience": "active_30d"
}
```

---

## Seasonal Markers (節氣)

### 二十四節氣中的重要節點

| 節氣 | 陽曆約 | code | 塔羅牌 | 主題 |
|------|--------|------|--------|------|
| **立春** | 2/4 | `lichun` | Ace of Wands | 新的開始，播種的能量 |
| **春分** | 3/20 | `chunfen` | Temperance (節制) | 平衡，日夜等長 |
| **清明** | 4/5 | `qingming` | Six of Cups | 追思，與過去的連結 |
| **夏至** | 6/21 | `xiazhi` | The Sun (太陽) | 陽光最盛，活力與熱情 |
| **中元** | 農曆 7/15 | `zhongyuan` | The Hermit (隱者) | 內省，與看不見的世界對話 |
| **秋分** | 9/23 | `qiufen` | Justice (正義) | 收穫，因果平衡 |
| **冬至** | 12/22 | `dongzhi` | The Star (星星) | 最長的夜後，希望重生 |

```json
{
  "code": "dongzhi",
  "name_zh": "冬至",
  "name_en": "Winter Solstice",
  "calendar_type": "solar",
  "month": 12,
  "day": 22,
  "importance": "cultural",
  "tarot_card": "The Star (星星)",
  "tarot_theme": "最長的夜之後是光明的回歸。希望、治癒、新的方向。",
  "template_ids": ["holiday_winter_solstice_a"],
  "send_offset_days": 0,
  "target_audience": "active_30d",
  "special_content": {
    "offer_type": "free_single_card",
    "theme": "冬至光明指引"
  }
}
```

---

## Taiwan-Specific Holidays (台灣特定)

| 日期 | code | 名稱 | 塔羅牌 | 發送對象 |
|------|------|------|--------|---------|
| 2/28 | `peace_memorial` | 和平紀念日 | The Tower (逆位) | 不發送行銷，僅關懷 |
| 4/4 | `childrens_day` | 兒童節 | The Fool | active_30d |
| 10/10 | `national_day` | 國慶日 | The Emperor | active_30d |
| 12/25 | `christmas` | 聖誕節 | The Star | all |

### 敏感節日處理

```python
SENSITIVE_HOLIDAYS = {
    "peace_memorial": {
        "no_marketing": True,
        "tone": "respectful",
        "message": "今天是和平紀念日，願和平與你同在。"
    },
    "zhongyuan": {
        "no_horror_imagery": True,
        "tone": "reflective",
        "avoid_cards": ["Death", "The Tower", "Ten of Swords"]
    }
}
```

---

## Zodiac Season Triggers (星座季觸發)

每當進入新的星座季，對該星座的使用者發送特別關懷：

| 星座 | 日期 | code | 塔羅牌 | 能量主題 |
|------|------|------|--------|---------|
| 水瓶座 | 1/20-2/18 | `zodiac_aquarius` | The Star | 創新、人道 |
| 雙魚座 | 2/19-3/20 | `zodiac_pisces` | The Moon | 直覺、夢境 |
| 牡羊座 | 3/21-4/19 | `zodiac_aries` | The Emperor | 行動、領導 |
| 金牛座 | 4/20-5/20 | `zodiac_taurus` | The Hierophant | 穩定、價值 |
| 雙子座 | 5/21-6/20 | `zodiac_gemini` | The Lovers | 溝通、選擇 |
| 巨蟹座 | 6/21-7/22 | `zodiac_cancer` | The Chariot | 家庭、情感 |
| 獅子座 | 7/23-8/22 | `zodiac_leo` | Strength | 創造力、自信 |
| 處女座 | 8/23-9/22 | `zodiac_virgo` | The Hermit | 分析、完善 |
| 天秤座 | 9/23-10/22 | `zodiac_libra` | Justice | 平衡、美感 |
| 天蠍座 | 10/23-11/21 | `zodiac_scorpio` | Death | 轉變、深度 |
| 射手座 | 11/22-12/21 | `zodiac_sagittarius` | Temperance | 探索、智慧 |
| 摩羯座 | 12/22-1/19 | `zodiac_capricorn` | The Devil | 野心、結構 |

### 星座季觸發規則

```json
{
  "code": "zodiac_season",
  "condition": {
    "type": "compound",
    "all": [
      { "customer_zodiac": "{{current_zodiac}}" },
      { "zodiac_season_day": 1 }
    ]
  },
  "action": {
    "template_pool": ["zodiac_season_{{zodiac}}_a"],
    "personalization": {
      "include_zodiac_card": true,
      "include_season_forecast": true,
      "cta_type": "zodiac_season_reading"
    }
  },
  "priority": "P3",
  "target_audience": "active_30d"
}
```

---

## Lunar Calendar Conversion

### 農曆轉換策略

```python
from lunarcalendar import Converter

def get_lunar_holiday_date(year: int, lunar_month: int, lunar_day: int) -> date:
    """將農曆日期轉換為陽曆。"""
    solar = Converter.LunarToSolar(year, lunar_month, lunar_day)
    return date(solar.year, solar.month, solar.day)

# 每年初執行一次，預計算全年農曆節日的陽曆日期
def precompute_lunar_holidays(year: int) -> dict[str, date]:
    return {
        "lunar_new_year_eve": get_lunar_holiday_date(year, 12, 30),
        "lunar_new_year": get_lunar_holiday_date(year, 1, 1),
        "lunar_new_year_work": get_lunar_holiday_date(year, 1, 5),
        "lantern_festival": get_lunar_holiday_date(year, 1, 15),
        "dragon_boat": get_lunar_holiday_date(year, 5, 5),
        "qixi": get_lunar_holiday_date(year, 7, 7),
        "zhongyuan": get_lunar_holiday_date(year, 7, 15),
        "mid_autumn": get_lunar_holiday_date(year, 8, 15),
    }
```

### Dynamic Holiday Rules

```python
def get_dynamic_holiday_date(year: int, rule: str) -> date:
    """計算動態規則節日（如母親節 = 五月第二個週日）。"""
    if rule == "second_sunday_of_may":
        may_first = date(year, 5, 1)
        first_sunday = may_first + timedelta(days=(6 - may_first.weekday()) % 7)
        return first_sunday + timedelta(weeks=1)
    # ... 其他動態規則
```

---

## Holiday Scheduling Engine

### 年度排程建立

```python
async def create_annual_holiday_schedule(year: int):
    """每年 1/1 執行，建立全年節慶排程。"""

    # 1. 預計算農曆日期
    lunar_dates = precompute_lunar_holidays(year)

    # 2. 載入所有節慶定義
    holidays = load_all_holidays()

    # 3. 建立排程
    for holiday in holidays:
        trigger_date = resolve_date(holiday, year, lunar_dates)
        send_date = trigger_date - timedelta(days=holiday.send_offset_days)

        await HolidaySchedule.create(
            code=holiday.code,
            year=year,
            trigger_date=trigger_date,
            send_date=send_date,
            importance=holiday.importance,
            target_audience=holiday.target_audience,
            template_ids=holiday.template_ids,
            status="scheduled"
        )

    logger.info(f"Created {len(holidays)} holiday schedules for {year}")
```

### 每日檢查

```python
# Cron: 每天 07:00 執行
async def check_holiday_triggers():
    """檢查今天是否有節慶觸發。"""
    today = date.today()

    schedules = await HolidaySchedule.find(
        send_date=today,
        status="scheduled"
    )

    for schedule in schedules:
        holiday = load_holiday(schedule.code)

        # 取得目標使用者
        customers = await get_target_customers(
            audience=schedule.target_audience
        )

        # 為每位使用者建立關懷計畫
        for customer in customers:
            # 敏感度檢查
            if needs_sensitivity_check(holiday):
                if not await pass_sensitivity_check(customer, holiday):
                    continue

            await create_caring_plan(
                customer_id=customer.id,
                trigger_type=f"holiday_{schedule.code}",
                template_ids=schedule.template_ids,
                personalization={
                    "holiday_name": holiday.name_zh,
                    "tarot_card": holiday.tarot_card,
                    "tarot_theme": holiday.tarot_theme,
                }
            )

        schedule.status = "executed"
        await schedule.save()
```

---

## Annual Calendar Summary

### 2025 年節慶觸發日曆

| 月份 | 節慶 | 類型 | 重要性 | 塔羅牌 |
|------|------|------|--------|--------|
| 1 月 | 元旦 (1/1) | 陽曆 | Major | The Fool |
| 1 月 | 農曆新年 (~1/29) | 農曆 | Major | The World |
| 2 月 | 情人節 (2/14) | 陽曆 | Major | The Lovers |
| 2 月 | 立春 (~2/4) | 節氣 | Cultural | Ace of Wands |
| 2 月 | 元宵 (~2/12) | 農曆 | Cultural | The Star |
| 3 月 | 春分 (~3/20) | 節氣 | Cultural | Temperance |
| 4 月 | 清明 (~4/5) | 節氣 | Cultural | Six of Cups |
| 4 月 | 兒童節 (4/4) | 陽曆 | Minor | The Fool |
| 5 月 | 母親節 (5 月第二週日) | 動態 | Major | The Empress |
| 6 月 | 端午節 (~5/31) | 農曆 | Major | Strength |
| 6 月 | 夏至 (~6/21) | 節氣 | Cultural | The Sun |
| 7 月 | 中元節 (~8/10) | 農曆 | Cultural | The Hermit |
| 8 月 | 父親節 (8/8) | 陽曆 | Major | The Emperor |
| 8 月 | 七夕 (~8/29) | 農曆 | Cultural | Two of Cups |
| 9 月 | 秋分 (~9/23) | 節氣 | Cultural | Justice |
| 10 月 | 國慶日 (10/10) | 陽曆 | Minor | The Emperor |
| 10 月 | 中秋節 (~10/6) | 農曆 | Major | The Moon |
| 12 月 | 冬至 (~12/22) | 節氣 | Cultural | The Star |
| 12 月 | 聖誕節 (12/25) | 陽曆 | Cultural | The Star |

*農曆日期為 2025 年近似值，實際需用農曆轉換庫計算。*
