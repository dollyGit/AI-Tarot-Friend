# Caring Rules — Trigger Rule Catalog

## Rule Schema

```python
class CaringRule:
    id: str                    # 規則唯一 ID
    name: str                  # 人類可讀名稱
    description: str           # 描述
    trigger_type: str          # 對應 Nudge.trigger_type
    category: str              # 'time_based' | 'condition_based' | 'lifecycle'
    enabled: bool              # 是否啟用
    priority: str              # 'P0' | 'P1' | 'P2' | 'P3'
    condition: dict            # 觸發條件 JSON
    action: dict               # 執行動作 JSON
    cooldown_hours: int        # 同類規則冷卻時間
    max_per_week: int          # 每週最多觸發次數
    requires_consent: str      # 需要的同意類型
```

---

## Time-Based Rules (時間基觸發)

### Rule: Inactivity 7 Days

```json
{
  "id": "rule_inactivity_7d",
  "name": "7天不活躍提醒",
  "trigger_type": "inactivity_7d",
  "category": "time_based",
  "priority": "P2",
  "condition": {
    "type": "inactivity",
    "days_since_last_visit": { "gte": 7, "lt": 14 },
    "exclude_if": [
      { "has_active_caring_plan": true },
      { "crisis_history_within_days": 7 },
      { "opt_out_category": "marketing" }
    ]
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line", "email"],
    "template_pool": ["inactivity_7d_casual_a", "inactivity_7d_casual_b"],
    "schedule": {
      "delay_hours": 0,
      "preferred_time": "14:00",
      "timezone": "Asia/Taipei",
      "respect_quiet_hours": true
    },
    "personalization": {
      "include_last_card": true,
      "include_free_reading_cta": true,
      "cta_type": "free_single_card"
    }
  },
  "cooldown_hours": 168,
  "max_per_week": 1,
  "requires_consent": "marketing_communication"
}
```

### Rule: Inactivity 14 Days

```json
{
  "id": "rule_inactivity_14d",
  "name": "14天不活躍提醒",
  "trigger_type": "inactivity_14d",
  "category": "time_based",
  "priority": "P1",
  "condition": {
    "type": "inactivity",
    "days_since_last_visit": { "gte": 14, "lt": 30 },
    "exclude_if": [
      { "received_nudge_type_within_days": ["inactivity_14d", 30] },
      { "crisis_history_within_days": 14 }
    ]
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line", "email"],
    "template_pool": ["inactivity_14d_warm_a", "inactivity_14d_warm_b"],
    "schedule": {
      "delay_hours": 0,
      "preferred_time": "11:00",
      "timezone": "Asia/Taipei",
      "respect_quiet_hours": true
    },
    "personalization": {
      "include_last_card": true,
      "include_free_reading_cta": true,
      "cta_type": "free_themed_spread"
    }
  },
  "cooldown_hours": 336,
  "max_per_week": 1,
  "requires_consent": "marketing_communication"
}
```

### Rule: Inactivity 30 Days

```json
{
  "id": "rule_inactivity_30d",
  "name": "30天不活躍 — 預抽牌策略",
  "trigger_type": "inactivity_30d",
  "category": "time_based",
  "priority": "P1",
  "condition": {
    "type": "inactivity",
    "days_since_last_visit": { "gte": 30, "lt": 60 },
    "exclude_if": [
      { "received_nudge_type_within_days": ["inactivity_30d", 60] }
    ]
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line", "email"],
    "template_pool": ["inactivity_30d_predraw_a"],
    "schedule": {
      "delay_hours": 0,
      "preferred_time": "10:00",
      "timezone": "Asia/Taipei",
      "respect_quiet_hours": true
    },
    "personalization": {
      "include_pre_drawn_card": true,
      "pre_draw_spread": "1-card",
      "cta_type": "unlock_reading"
    },
    "special_actions": [
      "generate_pre_drawn_card_preview"
    ]
  },
  "cooldown_hours": 720,
  "max_per_week": 1,
  "requires_consent": "marketing_communication"
}
```

### Rule: Inactivity 60 Days

```json
{
  "id": "rule_inactivity_60d",
  "name": "60天不活躍 — 溫和告別",
  "trigger_type": "inactivity_60d",
  "category": "time_based",
  "priority": "P0",
  "condition": {
    "type": "inactivity",
    "days_since_last_visit": { "gte": 60, "lt": 90 }
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["email", "line"],
    "template_pool": ["inactivity_60d_farewell_a"],
    "schedule": {
      "delay_hours": 0,
      "preferred_time": "10:00",
      "timezone": "Asia/Taipei",
      "respect_quiet_hours": true
    },
    "personalization": {
      "include_feedback_survey": true,
      "cta_type": "feedback_survey"
    }
  },
  "cooldown_hours": 1440,
  "max_per_week": 1,
  "requires_consent": "transactional"
}
```

### Rule: Inactivity 90 Days

```json
{
  "id": "rule_inactivity_90d",
  "name": "90天不活躍 — 僅節慶觸發",
  "trigger_type": "inactivity_90d",
  "category": "time_based",
  "priority": "P0",
  "condition": {
    "type": "compound",
    "all": [
      { "days_since_last_visit": { "gte": 90 } },
      {
        "any": [
          { "is_birthday_within_days": 3 },
          { "is_major_holiday_within_days": 1 }
        ]
      }
    ]
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line", "email"],
    "template_pool": ["inactivity_90d_special_a"],
    "personalization": {
      "include_special_offer": true,
      "cta_type": "return_package"
    }
  },
  "cooldown_hours": 2160,
  "max_per_week": 1,
  "requires_consent": "marketing_communication"
}
```

### Rule: Weekly Summary

```json
{
  "id": "rule_weekly_summary",
  "name": "每週摘要",
  "trigger_type": "weekly_summary",
  "category": "time_based",
  "priority": "P3",
  "condition": {
    "type": "schedule",
    "cron": "0 10 * * 1",
    "require_activity_in_days": 14,
    "min_sessions_in_week": 1
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["email", "line"],
    "template_pool": ["weekly_summary_a"],
    "personalization": {
      "include_weekly_card_summary": true,
      "include_sentiment_trend": true,
      "include_upcoming_events": true,
      "cta_type": "start_new_reading"
    }
  },
  "cooldown_hours": 168,
  "max_per_week": 1,
  "requires_consent": "marketing_communication"
}
```

### Rule: Monthly Summary

```json
{
  "id": "rule_monthly_summary",
  "name": "每月摘要",
  "trigger_type": "monthly_summary",
  "category": "time_based",
  "priority": "P3",
  "condition": {
    "type": "schedule",
    "cron": "0 10 1 * *",
    "require_activity_in_days": 60,
    "min_sessions_in_month": 1
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["email"],
    "template_pool": ["monthly_summary_a"],
    "personalization": {
      "include_monthly_card_stats": true,
      "include_life_area_analysis": true,
      "include_sentiment_journey": true,
      "include_month_ahead_card": true,
      "cta_type": "monthly_reading"
    }
  },
  "cooldown_hours": 720,
  "max_per_week": 1,
  "requires_consent": "marketing_communication"
}
```

### Rule: Birthday

```json
{
  "id": "rule_birthday",
  "name": "生日祝福",
  "trigger_type": "birthday",
  "category": "time_based",
  "priority": "P1",
  "condition": {
    "type": "schedule",
    "trigger_on": "customer.birthday",
    "offset_days": 0,
    "require_birthday_data": true
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line", "email"],
    "template_pool": ["birthday_zodiac_a", "birthday_zodiac_b"],
    "schedule": {
      "preferred_time": "09:00",
      "timezone": "Asia/Taipei"
    },
    "personalization": {
      "include_zodiac_card": true,
      "include_birthday_spread": true,
      "include_special_offer": true,
      "cta_type": "birthday_reading"
    }
  },
  "cooldown_hours": 8760,
  "max_per_week": 1,
  "requires_consent": "transactional"
}
```

---

## Condition-Based Rules (條件基觸發)

### Rule: Mood Decline

```json
{
  "id": "rule_mood_decline",
  "name": "情緒下降介入",
  "trigger_type": "mood_decline",
  "category": "condition_based",
  "priority": "P0",
  "condition": {
    "type": "compound",
    "all": [
      { "compound_score": { "lt": -0.5 } },
      { "score_decline": { "gte": 0.3 } },
      { "crisis_level": { "in": ["none", "moderate"] } }
    ],
    "exclude_if": [
      { "received_nudge_type_within_hours": ["mood_decline", 48] }
    ]
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line"],
    "template_pool": ["mood_decline_24h_a", "mood_decline_24h_b"],
    "schedule": {
      "delay_hours": 24,
      "preferred_time": "14:00",
      "timezone": "Asia/Taipei"
    },
    "personalization": {
      "include_session_reference": true,
      "include_warm_message": true,
      "include_soft_resources": false,
      "cta_type": "free_reading"
    },
    "followup": {
      "check_at_hours": 72,
      "if_no_visit": {
        "template": "mood_decline_72h_a",
        "include_soft_resources": true
      }
    }
  },
  "cooldown_hours": 72,
  "max_per_week": 2,
  "requires_consent": "transactional"
}
```

### Rule: Crisis Follow-Up 24h

```json
{
  "id": "rule_crisis_followup_24h",
  "name": "危機跟進 24 小時",
  "trigger_type": "crisis_followup_24h",
  "category": "condition_based",
  "priority": "P0",
  "condition": {
    "type": "event",
    "event": "sentiment.alert",
    "crisis_level": { "in": ["immediate", "high"] }
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line"],
    "template_pool": ["crisis_followup_24h"],
    "schedule": {
      "delay_hours": 24,
      "preferred_time": null,
      "respect_quiet_hours": false
    },
    "personalization": {
      "include_display_name": true,
      "include_resources": true,
      "tone": "warm_gentle"
    },
    "followup": {
      "create_72h_plan": true,
      "create_weekly_4w_plan": true
    }
  },
  "cooldown_hours": 0,
  "max_per_week": 7,
  "requires_consent": "safety"
}
```

### Rule: Crisis Follow-Up 72h

```json
{
  "id": "rule_crisis_followup_72h",
  "name": "危機跟進 72 小時",
  "trigger_type": "crisis_followup_72h",
  "category": "condition_based",
  "priority": "P1",
  "condition": {
    "type": "followup",
    "parent_rule": "rule_crisis_followup_24h",
    "delay_hours": 72
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line"],
    "template_pool": ["crisis_followup_72h"],
    "personalization": {
      "include_resources": true,
      "tone": "warm_gentle",
      "never_mention_crisis": true
    }
  },
  "cooldown_hours": 0,
  "max_per_week": 7,
  "requires_consent": "safety"
}
```

### Rule: Post-Purchase

```json
{
  "id": "rule_post_purchase",
  "name": "購後關懷",
  "trigger_type": "post_purchase",
  "category": "condition_based",
  "priority": "P2",
  "condition": {
    "type": "event",
    "event": "order.placed",
    "product_category": "crystal"
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line", "email"],
    "schedule_sequence": [
      {
        "delay_hours": 1,
        "template": "post_purchase_confirm",
        "personalization": { "include_product_name": true }
      },
      {
        "delay_hours": 72,
        "template": "post_purchase_guide",
        "personalization": {
          "include_product_name": true,
          "include_related_card": true,
          "include_usage_guide": true
        }
      },
      {
        "delay_hours": 168,
        "template": "post_purchase_feedback",
        "personalization": {
          "include_product_name": true,
          "cta_type": "share_experience"
        }
      }
    ]
  },
  "cooldown_hours": 48,
  "max_per_week": 3,
  "requires_consent": "transactional"
}
```

### Rule: Cart Abandoned

```json
{
  "id": "rule_cart_abandoned",
  "name": "購物車遺棄",
  "trigger_type": "cart_abandoned",
  "category": "condition_based",
  "priority": "P2",
  "condition": {
    "type": "compound",
    "all": [
      { "cart_created_hours_ago": { "gte": 24 } },
      { "cart_not_completed": true },
      { "cart_value_cents": { "gte": 500 } }
    ]
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line", "email"],
    "template_pool": ["cart_abandoned_gentle_a"],
    "personalization": {
      "include_cart_items": true,
      "include_crystal_tarot_connection": true,
      "cta_type": "return_to_cart"
    }
  },
  "cooldown_hours": 168,
  "max_per_week": 1,
  "requires_consent": "marketing_communication"
}
```

### Rule: Positive Feedback Thank You

```json
{
  "id": "rule_positive_feedback",
  "name": "正向回饋感謝",
  "trigger_type": "positive_feedback",
  "category": "condition_based",
  "priority": "P3",
  "condition": {
    "type": "event",
    "event": "reading.feedback",
    "rating": { "gte": 4 }
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line"],
    "template_pool": ["positive_feedback_thanks_a"],
    "schedule": {
      "delay_hours": 2,
      "preferred_time": null
    },
    "personalization": {
      "include_display_name": true,
      "cta_type": "share_with_friends"
    }
  },
  "cooldown_hours": 168,
  "max_per_week": 1,
  "requires_consent": "transactional"
}
```

### Rule: Subscription Expiring

```json
{
  "id": "rule_subscription_expiring",
  "name": "訂閱即將到期",
  "trigger_type": "subscription_expiring",
  "category": "lifecycle",
  "priority": "P1",
  "condition": {
    "type": "compound",
    "all": [
      { "subscription_expires_in_days": { "lte": 7 } },
      { "auto_renew": false }
    ]
  },
  "action": {
    "create_plan": true,
    "channel_preference": ["line", "email"],
    "template_pool": ["subscription_expiring_7d_a"],
    "personalization": {
      "include_usage_stats": true,
      "include_premium_features_used": true,
      "cta_type": "renew_subscription"
    }
  },
  "cooldown_hours": 168,
  "max_per_week": 1,
  "requires_consent": "transactional"
}
```

---

## Rule Evaluation Engine

### 評估順序

```python
async def evaluate_rules(customer_id: str, event: dict) -> list[CaringPlan]:
    """
    規則評估引擎 — 按優先級排序，檢查條件後建立關懷計畫。
    """
    plans = []

    # 1. 取得所有啟用的規則，按優先級排序
    rules = await get_enabled_rules(order_by="priority")

    # 2. 取得客戶上下文
    ctx = await get_customer_context(customer_id)

    for rule in rules:
        # 3. 檢查條件是否匹配
        if not evaluate_condition(rule.condition, ctx, event):
            continue

        # 4. 檢查冷卻期
        if await is_in_cooldown(customer_id, rule):
            continue

        # 5. 檢查頻率限制
        if not await check_throttle(customer_id, rule.priority):
            continue

        # 6. 檢查同意狀態
        if not await check_consent(customer_id, rule.requires_consent):
            continue

        # 7. 建立關懷計畫
        plan = await create_caring_plan(customer_id, rule, ctx)
        plans.append(plan)

    return plans
```

### 條件評估器

```python
def evaluate_condition(condition: dict, ctx: CustomerContext, event: dict) -> bool:
    """遞迴評估條件 JSON。"""

    ctype = condition.get("type")

    if ctype == "inactivity":
        days = ctx.days_since_last_visit
        range_check = condition.get("days_since_last_visit", {})
        if not check_range(days, range_check):
            return False

    elif ctype == "event":
        if event.get("type") != condition.get("event"):
            return False
        # 檢查事件特定條件
        for key, expected in condition.items():
            if key in ("type", "event"):
                continue
            if not match_value(event.get(key), expected):
                return False

    elif ctype == "compound":
        if "all" in condition:
            return all(evaluate_condition(c, ctx, event) for c in condition["all"])
        if "any" in condition:
            return any(evaluate_condition(c, ctx, event) for c in condition["any"])

    elif ctype == "schedule":
        return check_cron_match(condition.get("cron"))

    elif ctype == "followup":
        parent = condition.get("parent_rule")
        delay = condition.get("delay_hours")
        return await check_followup_ready(ctx.customer_id, parent, delay)

    # 檢查排除條件
    for excl in condition.get("exclude_if", []):
        if evaluate_exclusion(excl, ctx):
            return False

    return True
```

---

## Consent Types

| 同意類型 | 描述 | 範例觸發 |
|---------|------|---------|
| `safety` | 安全相關，不需要同意 | 危機跟進 |
| `transactional` | 交易相關，預設同意 | 訂單確認、回饋邀請、訂閱到期 |
| `marketing_communication` | 行銷通訊，需要明確同意 | 不活躍提醒、節慶促銷、購物車提醒 |
| `weekly_digest` | 每週摘要，需要明確同意 | 每週/月摘要 |
