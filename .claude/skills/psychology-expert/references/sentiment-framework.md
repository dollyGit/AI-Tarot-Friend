# Sentiment & Emotion Framework

## Emotion Taxonomy

### Primary Emotions (Plutchik's Wheel Adapted)

```
        Joy 喜悅
      /         \
Trust 信任    Anticipation 期待
      |            |
Fear 恐懼    Surprise 驚訝
      \         /
     Sadness 悲傷
      /         \
Disgust 厭惡   Anger 憤怒
```

### TarotFriend Emotion Categories

| Category | Emotions (zh-TW) | Emotions (EN) | Valence |
|----------|-------------------|---------------|---------|
| **Positive** | 開心, 感激, 希望, 樂觀, 自信, 平靜, 期待, 有動力 | happy, grateful, hopeful, optimistic, confident, calm, excited, motivated | +0.3 to +1.0 |
| **Neutral** | 好奇, 思考, 平淡, 猶豫 | curious, reflective, indifferent, hesitant | -0.3 to +0.3 |
| **Negative Mild** | 擔心, 困惑, 迷茫, 不安, 疲憊, 無聊 | worried, confused, lost, uneasy, tired, bored | -0.3 to -0.5 |
| **Negative Moderate** | 焦慮, 沮喪, 害怕, 內疚, 孤獨, 憤怒, 壓力 | anxious, depressed, afraid, guilty, lonely, angry, stressed | -0.5 to -0.7 |
| **Negative Severe** | 絕望, 崩潰, 極度焦慮, 恐懼, 想死 | hopeless, breaking down, extreme anxiety, terror, suicidal | -0.7 to -1.0 |

---

## Compound Sentiment Score

### Calculation

```typescript
interface CompoundSentiment {
  // Individual source scores
  realtime_score: number;      // From SentimentAnalyzer (-1 to 1)
  historical_avg: number;      // 7-day average from InfluxDB
  memory_sentiment: number;    // Average from relevant memory summaries
  relationship_impact: number; // From Neo4j relationship analysis

  // Compound score
  compound_score: number;      // Weighted combination
  trend_direction: number;     // Rate of change (negative = declining)
  volatility: number;          // Standard deviation of recent scores
}

function calculateCompound(sources: CompoundSentiment): number {
  return (
    sources.realtime_score * 0.40 +
    sources.historical_avg * 0.25 +
    sources.memory_sentiment * 0.20 +
    sources.relationship_impact * 0.15
  );
}
```

### Score to Tone Mapping

| Compound Score Range | Tone Level | Description |
|---------------------|------------|-------------|
| > 0.2 | warm | User is in a good place, light and encouraging |
| -0.2 to 0.2 | supportive | Balanced, informative, gently guiding |
| -0.6 to -0.2 | empathetic | Validate emotions first, then gentle insight |
| < -0.6 | crisis | Safety-first, maximum empathy, professional resources |

### Trend-Based Adjustments

| Trend | Adjustment |
|-------|-----------|
| Improving (trend > +0.1) | Can reference progress: "I notice things seem to be shifting..." |
| Stable (trend -0.1 to +0.1) | Standard approach |
| Declining (trend < -0.1) | Extra warmth, check in on specific concerns |
| Volatile (stddev > 0.3) | Acknowledge emotional turbulence, stabilizing techniques |

---

## Card-Emotion Mapping

### Major Arcana Emotional Associations

| Card | Primary Emotion | Shadow Emotion | Crisis-Sensitive Reframe |
|------|----------------|----------------|------------------------|
| The Fool | 期待, excitement | 恐懼, fear of unknown | "New beginnings can feel scary, and that's okay." |
| The Magician | 自信, empowerment | 不安, inadequacy | "You have more power than you realize." |
| High Priestess | 平靜, inner peace | 困惑, confusion | "Trust your inner knowing, even when things seem unclear." |
| The Empress | 感激, nurturing | 空虛, emptiness | "You deserve the same care you give others." |
| The Emperor | 穩定, stability | 壓力, pressure | "Structure can be freeing, not restricting." |
| The Chariot | 有動力, determination | 焦慮, overwhelming pace | "Your drive is admirable. Remember to rest too." |
| Strength | 勇氣, courage | 疲憊, exhaustion | "Being gentle with yourself IS strength." |
| The Hermit | 平靜, peaceful solitude | 孤獨, loneliness | "Solitude chosen is different from loneliness." |
| Wheel of Fortune | 希望, hope for change | 不安, uncertainty | "Change brings opportunity, even when it feels uncertain." |
| The Hanged Man | 思考, contemplation | 無力, powerlessness | "Pausing isn't being stuck. It's preparing." |
| Death | 接受, acceptance | 恐懼, fear of loss | "What's ending has completed its purpose." |
| The Tower | 清醒, awakening | 恐慌, panic | "After the storm comes clarity." |
| The Star | 希望, renewed hope | 脆弱, vulnerability | "Hope isn't naive. It's brave." |
| The Moon | 直覺, intuitive depth | 焦慮, anxiety | "Trust the process, even when you can't see clearly." |
| The Sun | 喜悅, pure joy | — | "You deserve this lightness." |
| Judgement | 覺醒, inner calling | 內疚, judgment/guilt | "This is about renewal, not punishment." |
| The World | 圓滿, completion | 空虛, post-completion void | "Celebrate this completion before looking to what's next." |

### Minor Arcana Emotional Hotspots

Cards that frequently trigger emotional responses and need special care:

| Card | Emotional Risk | Handling Approach |
|------|---------------|-------------------|
| Three of Swords | Heartbreak, betrayal | Validate pain, emphasize it's a feeling not a permanent state |
| Five of Cups | Grief, regret | Acknowledge loss, point to the two upright cups remaining |
| Eight of Swords | Feeling trapped | Emphasize the blindfold is removable, options exist |
| Nine of Swords | Anxiety, nightmares | "The worst fears are often in our heads, not in reality" |
| Ten of Swords | Rock bottom | "The sky above is clear. This is the bottom, meaning it only gets better" |
| Five of Pentacles | Financial/health worry | "Help is closer than it seems" (point to the church window in imagery) |
| Three of Pentacles reversed | Feeling unappreciated | Validate their skills, suggest new environments may appreciate them |

---

## Sentiment Pipeline Enhancement Roadmap

### Current (MVP): Rule-Based

```
Keywords (EN + zh-TW) → Simple score → Label
Limitations: No context, no sarcasm detection, binary keyword matching
```

### Phase 2: LLM-Enhanced

```
User message → LLM (claude-3-haiku, 300 tokens) → Structured output:
{
  "primary_emotion": "焦慮",
  "secondary_emotion": "困惑",
  "score": -0.45,
  "confidence": 0.82,
  "context_note": "User is anxious about mother's health",
  "crisis_indicators": []
}
```

### Phase 3: Multi-Modal

```
Text sentiment + conversation flow analysis + topic graph + temporal patterns
→ Comprehensive emotional state assessment
→ Personalized tone calibration
```

---

## Emotion Tracking Over Time

### InfluxDB Write Format

```typescript
// After each user message
await influxWrite('customer_sentiment', {
  tags: {
    customer_id: user.id,
    source: 'reading',           // reading | caring | manual
    channel: session.channel,     // web | mobile | line
  },
  fields: {
    score: sentiment.score,       // -1 to 1
    label: sentiment.label,       // negative | neutral | positive
    confidence: sentiment.confidence,
    crisis_level: crisisLevel,    // none | moderate | high | immediate
    primary_emotion: emotion,     // 焦慮, 開心, etc.
  },
  timestamp: new Date()
});
```

### Querying Emotional Patterns

```flux
// Find sessions where sentiment dropped significantly during the session
from(bucket: "raw_data")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "customer_sentiment")
  |> filter(fn: (r) => r.customer_id == "${id}")
  |> difference()
  |> filter(fn: (r) => r._value < -0.3)  // Dropped by 0.3+ in one session
```
