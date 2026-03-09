---
name: tarot-expert
description: >
  TarotFriend 塔羅專家。精通 78 張塔羅牌義（22 大秘儀 + 56 小秘儀）、正位與逆位解讀、
  四種牌陣（單張/三張/七張/凱爾特十字）、元素尊嚴（火/水/風/土交互作用）、牌組合分析、
  數字學連結、Rider-Waite 傳統、賦權式解讀框架。當工作涉及牌義查詢、牌陣設計、
  解讀 prompt 工程、塔羅引擎邏輯、新牌陣開發時，務必使用此技能。
  Tarot domain expert for TarotFriend. Use for card meanings (78 cards, Major + Minor Arcana),
  upright vs reversed interpretation, spread layouts (1-card, 3-card, 7-card, Celtic Cross),
  elemental dignities (Fire/Water/Air/Earth interactions), card combination analysis,
  numerology connections, prompt engineering for tarot interpretation, and empowerment-based
  reading frameworks. Always invoke when working on card meanings, spread design, interpretation
  prompts, TarotEngine logic, or new spread development.
---

# Tarot Expert — TarotFriend 塔羅專家

## When to Use

Invoke this skill when:
- Looking up or validating card meanings (upright/reversed)
- Designing or modifying spread layouts
- Writing or reviewing interpretation prompts
- Analyzing card combinations and patterns
- Implementing elemental dignity logic
- Working with TarotEngine code (drawing, shuffling)
- Creating new spread types
- Reviewing interpretation quality
- Designing the card seed data
- Working with bilingual card names (EN/zh-TW)

---

## TarotFriend Card System Overview

### 78-Card Deck (Rider-Waite Tradition)

| Category | Count | Range | Examples |
|----------|-------|-------|---------|
| **Major Arcana** | 22 | 0-21 | The Fool (0), The Magician (I), ..., The World (XXI) |
| **Wands (權杖)** | 14 | Ace-10 + Page/Knight/Queen/King | Fire element, action & will |
| **Cups (聖杯)** | 14 | Ace-10 + Page/Knight/Queen/King | Water element, emotions & relationships |
| **Swords (寶劍)** | 14 | Ace-10 + Page/Knight/Queen/King | Air element, intellect & conflict |
| **Pentacles (錢幣)** | 14 | Ace-10 + Page/Knight/Queen/King | Earth element, material & practical |

### Existing Code Reference

- **TarotEngine**: `/TarotReading/backend/src/services/tarot-engine.ts`
  - Fisher-Yates shuffle with CSPRNG (`crypto.randomBytes`)
  - Seeded mode for reproducibility (`crypto.createHash('sha256')`)
  - 50/50 upright/reversed probability
- **Spread types**: `'1-card' | '3-card' | '7-card' | 'celtic-cross'`
- **Card model** (Prisma): `Card { id, arcana_type, suit, name_en, name_zh, upright_meaning, reversed_meaning, imagery_url, order }`
- **Spread model**: `Spread { name, card_count, position_meanings: Json }`
- **Prompts**: `/TarotReading/backend/src/lib/prompts.ts`

---

## Interpretation Philosophy

### Core Principles (Constitution)

1. **Empowerment over fatalism**: Cards reflect possibilities, not fixed outcomes. The user has agency.
2. **Constructive framing**: Even "negative" cards carry growth opportunities. Frame warnings as "areas to be mindful of."
3. **Actionable insight**: Every interpretation must include specific, practical advice.
4. **Emotional safety**: Use CRISIS_SENSITIVE_PROMPT when crisis level is moderate or higher.
5. **Cultural sensitivity**: Support zh-TW and English. Respect spiritual traditions without appropriation.

### Upright vs Reversed Framework

| Aspect | Upright | Reversed |
|--------|---------|----------|
| **Energy direction** | External, manifesting | Internal, blocked or delayed |
| **Interpretation** | Card's primary meaning active | Meaning internalized, weakened, or resisted |
| **Tone** | Direct, present | Reflective, past influence, or shadow aspect |
| **Advice** | Act on this energy | Examine what's blocking this energy |

**Important**: Reversed does NOT mean "opposite" or "bad." It means the energy is redirected inward.

---

## Spread Layouts

### 1-Card (Quick Insight)

```
Position 1: Core message for the day/question
```

**Use when**: Daily guidance, simple yes/no energy, quick check-in
**Interpretation**: Focus on the single card's full spectrum of meaning.

### 3-Card Spread

```
[1]  [2]  [3]
```

**Standard layout**: Past → Present → Future
**Alternative layouts**:
- Situation → Challenge → Advice
- Mind → Body → Spirit
- You → Partner → Relationship

**Use when**: Focused question, moderate depth needed

### 7-Card Horseshoe

```
[1]  [2]  [3]  [4]  [5]  [6]  [7]
```

| Position | Meaning |
|----------|---------|
| 1 | Past influences |
| 2 | Present situation |
| 3 | Hidden influences |
| 4 | Obstacles |
| 5 | External influences (people/environment) |
| 6 | Advice / best approach |
| 7 | Probable outcome |

### Celtic Cross (10 Cards)

```
        [3]
    [5] [1/2] [6]
        [4]
              [10]
              [9]
              [8]
              [7]
```

| Position | Meaning | Reading Focus |
|----------|---------|--------------|
| 1 | Present situation | What you're experiencing now |
| 2 | Crossing card (challenge) | What's opposing or complicating |
| 3 | Crown (conscious goal) | What you're aiming for |
| 4 | Foundation (subconscious) | What drives you beneath the surface |
| 5 | Recent past | What's fading but still relevant |
| 6 | Near future | What's approaching in weeks/months |
| 7 | Self-perception | How you see yourself in this |
| 8 | Environment | How others see you / external forces |
| 9 | Hopes and fears | What you wish for AND fear |
| 10 | Final outcome | Where this trajectory leads |

**Reading order**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
**Narrative arc**: Start with the central cross (1-6) for the story, then the staff (7-10) for the deeper context.

---

## Elemental Dignities

Each card carries an elemental association. When cards appear adjacent, their elements interact:

### Element Assignments

| Element | Major Arcana | Minor Arcana |
|---------|-------------|-------------|
| **Fire 🔥** | Emperor, Strength, Tower, Sun, Judgement | Wands (全套) |
| **Water 💧** | High Priestess, Chariot, Hanged Man, Death, Moon | Cups (全套) |
| **Air 🌬️** | Fool, Magician, Lovers, Justice, Star | Swords (全套) |
| **Earth 🌍** | Empress, Hierophant, Hermit, Devil, World | Pentacles (全套) |

### Interaction Rules

| Pair | Interaction | Effect on Reading |
|------|-------------|-------------------|
| Fire + Air | **Strengthening** | Energies amplify each other; powerful action |
| Water + Earth | **Strengthening** | Nurturing, growth, grounded emotions |
| Fire + Water | **Weakening** | Conflict between passion and emotion; internal tension |
| Air + Earth | **Weakening** | Overthinking vs practicality; analysis paralysis |
| Fire + Earth | **Neutral** | Passion meets stability; can go either way |
| Water + Air | **Neutral** | Emotion meets intellect; balance needed |
| Same element | **Amplifying** | The theme is strongly emphasized |

### Application in Interpretation

When two adjacent cards have:
- **Strengthening** pair: "These cards reinforce each other. The energy is flowing powerfully in this direction."
- **Weakening** pair: "There's tension between these energies. This suggests an inner conflict to resolve."
- **Neutral**: Read each card independently, noting their complementary nature.

---

## Card Combination Patterns

### Multiple Major Arcana

| Count in Spread | Significance |
|----------------|--------------|
| 0 | Day-to-day matters; practical focus |
| 1-2 | Normal reading with some significant themes |
| 3-4 | Major life themes are at play |
| 5+ | Life-changing period; karmic/transformative energy |

### Suit Dominance

| Dominant Suit | Life Focus |
|--------------|-----------|
| Wands majority | Career, ambition, creative projects, willpower |
| Cups majority | Relationships, emotions, intuition, healing |
| Swords majority | Mental challenges, decisions, conflicts, truth-seeking |
| Pentacles majority | Finances, health, home, material concerns |

### Number Repetitions

| Repeated Number | Meaning |
|----------------|---------|
| Multiple Aces | New beginnings across life areas |
| Multiple 2s | Choices, partnerships, balance needed |
| Multiple 3s | Growth, collaboration, creative expression |
| Multiple 4s | Stability, foundation-building, rest |
| Multiple 5s | Conflict, change, instability |
| Multiple 6s | Harmony, communication, resolution |
| Multiple 7s | Reflection, assessment, inner work |
| Multiple 8s | Movement, power, mastery |
| Multiple 9s | Completion, wisdom, near-fulfillment |
| Multiple 10s | Endings/completions, cycle closing |

### Court Card Patterns

| Pattern | Interpretation |
|---------|---------------|
| Multiple Pages | Learning phase, messages coming, youthful energy |
| Multiple Knights | Rapid movement, multiple pursuits, action-oriented |
| Multiple Queens | Nurturing energy, emotional maturity, inner wisdom |
| Multiple Kings | Authority, mastery, external power, leadership |

---

## Interpretation Prompt Template

### Current Production Prompt (INTERPRETATION_V1)

```
You are an empathetic tarot reader providing guidance with actionable insights.

IMPORTANT GUIDELINES:
- Be constructive and empowering, never fatalistic or fear-inducing
- Provide specific, actionable advice
- Acknowledge the user's emotions and concerns
- Focus on personal agency and growth opportunities
- Use gentle language for warnings, frame as "areas to be mindful of"

User Context: {{context}}
Cards Drawn: {{cards}}

Structure:
1. TL;DR (1-2 sentences)
2. Key Points (3-5 main insights)
3. Actionable Advice:
   - Short-term (next few days)
   - Medium-term (next few weeks)
   - Long-term (next few months)
4. Gentle Warnings
```

### Enhanced Prompt (V2 — with memory + graph context)

When Data Processing Expert provides enriched context, use this enhanced template:

```
You are a deeply empathetic tarot reader with memory of this user's journey.

USER PROFILE:
- Name: {{display_name}}
- Zodiac: {{zodiac_sign}} | Chinese Zodiac: {{chinese_zodiac}}
- Day Master (八字): {{bazi_day_master}}
- Reading style preference: {{preferred_reading_style}}

MEMORY CONTEXT:
{{#relevant_summaries}}
- Previous session ({{session_date}}): {{summary}} [Mood: {{sentiment_label}}]
{{/relevant_summaries}}

{{#long_term_insights}}
- Recurring pattern: {{memory}} [Area: {{life_area}}, Importance: {{importance}}]
{{/long_term_insights}}

RELATIONSHIP CONTEXT:
{{#key_people}}
- {{name}} ({{relationship}}): Strength {{strength}}, Recent: {{recent_context}}
{{/key_people}}

EMOTIONAL TREND:
- Current: {{current_score}} | 7-day avg: {{7d_average}} | Trend: {{30d_trend}}

CARDS DRAWN:
{{cards}}

SPREAD TYPE: {{spread_type}}

GUIDELINES:
1. Reference past sessions naturally ("Last time we talked about...")
2. If a person appears in both cards and memory, connect them
3. Match the user's emotional state with appropriate tone
4. If sentiment is declining, add extra warmth and encouragement
5. Respect elemental dignities between adjacent cards
6. If crisis_level is moderate or higher, switch to CRISIS_SENSITIVE mode

STRUCTURE:
1. Warm greeting (reference previous visit if applicable)
2. TL;DR
3. Position-by-position interpretation (with elemental dignity notes)
4. Synthesis: How cards connect to user's life context
5. Actionable Advice (short/medium/long term)
6. Gentle Warnings
7. Encouraging closing
```

---

## Crisis-Sensitive Reading

When `crisis_level` is `moderate`, `high`, or `immediate`:

```
CRITICAL: Use CRISIS_SENSITIVE_PROMPT
- Extra emphasis on empathy and validation
- Frame every card as offering hope and paths forward
- Include professional support resources
- Avoid any language that could feel deterministic or hopeless
- The Tower reversed → "A storm that is passing" not "Destruction"
- Death → "Transformation and renewal" not "Ending"
- Ten of Swords → "The worst is behind you" not "Painful ending"
```

---

## Numerology Connections

Each card number carries numerological meaning that enriches interpretation:

| Number | Meaning | Keywords |
|--------|---------|----------|
| 0 (Fool) | Infinite potential | Beginning, leap of faith |
| I | Unity, initiation | Willpower, new start |
| II | Duality, partnership | Choice, balance |
| III | Creation, expression | Growth, creativity |
| IV | Structure, stability | Foundation, order |
| V | Change, conflict | Challenge, freedom |
| VI | Harmony, love | Communication, beauty |
| VII | Reflection, inner work | Wisdom, solitude |
| VIII | Power, cycles | Mastery, karma |
| IX | Completion, wisdom | Integration, fulfillment |
| X | Endings & beginnings | Cycle complete, transformation |

---

## Adding a New Spread Type

When designing a new spread for TarotFriend:

1. **Define positions**: Each position needs `{position: number, meaning_en: string, meaning_zh: string}`
2. **Define reading order**: The sequence in which positions should be interpreted
3. **Define narrative arc**: How the positions tell a story together
4. **Map elements**: If positions are adjacent, note elemental dignity effects
5. **Create seed data**: Add to `seed-spreads.ts` with `premium_only` flag
6. **Update TarotEngine**: Add spread type to `SPREAD_CARD_COUNTS`
7. **Write interpretation guidance**: Position-specific prompt additions

### Spread Design Checklist

- [ ] Each position has a clear, distinct meaning
- [ ] Positions build a narrative when read in sequence
- [ ] Reading order is intuitive (not jumping randomly)
- [ ] Bilingual position names (en + zh-TW)
- [ ] Premium tier decision (free: 1-card/3-card; premium: 7-card/celtic-cross)
- [ ] Elemental dignity guide for adjacent positions
- [ ] Test with at least 10 different card combinations

---

## Key File References

- TarotEngine: `/Users/martinlee/Projects/TarotFriend/TarotReading/backend/src/services/tarot-engine.ts`
- Prompts: `/Users/martinlee/Projects/TarotFriend/TarotReading/backend/src/lib/prompts.ts`
- Prisma schema: `/Users/martinlee/Projects/TarotFriend/TarotReading/backend/prisma/schema.prisma`
- Card model: `Card` in schema (order 0-77, arcana_type, suit, name_en, name_zh)
- Spread model: `Spread` in schema (position_meanings JSON)

For complete card meanings, see `references/major-arcana.md` and `references/minor-arcana.md`.
For combination rules, see `references/combinations.md`.
For spread details, see `references/spreads.md`.

---

## Integration with Other Skills

- **Data Processing Expert**: Provides enriched user context (memory, graph, sentiment)
- **Psychology Expert**: Receives card interpretation + context for psychological enrichment
- **Technical Expert**: Validates TarotEngine code changes follow architecture
- **Customer Service Agent**: Card themes inform caring message personalization
