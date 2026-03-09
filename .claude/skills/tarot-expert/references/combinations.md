# Card Combinations — Elemental Dignity, Pair Meanings & Patterns

## Elemental Dignity Table

### Quick Reference

```
Fire (Wands)   + Air (Swords)     = STRENGTHEN (active + intellectual = powerful action)
Water (Cups)   + Earth (Pentacles) = STRENGTHEN (emotional + practical = grounded growth)
Fire (Wands)   + Water (Cups)      = WEAKEN    (passion vs emotion = inner conflict)
Air (Swords)   + Earth (Pentacles) = WEAKEN    (overthinking vs practical = analysis paralysis)
Fire (Wands)   + Earth (Pentacles) = NEUTRAL   (passion + stability = depends on context)
Water (Cups)   + Air (Swords)      = NEUTRAL   (emotion + intellect = balance needed)
Same + Same                        = AMPLIFY   (theme strongly emphasized)
```

### Major Arcana Element Assignments

| Card | Element | Rationale |
|------|---------|-----------|
| 0 The Fool | Air | Freedom, beginnings, breath of new life |
| I The Magician | Air | Mercury, communication, intellect |
| II High Priestess | Water | Moon, intuition, subconscious |
| III The Empress | Earth | Venus, fertility, material abundance |
| IV The Emperor | Fire | Aries, authority, will |
| V The Hierophant | Earth | Taurus, tradition, stability |
| VI The Lovers | Air | Gemini, choices, duality |
| VII The Chariot | Water | Cancer, emotional drive |
| VIII Strength | Fire | Leo, courage, inner fire |
| IX The Hermit | Earth | Virgo, grounded wisdom |
| X Wheel of Fortune | Fire | Jupiter, expansion, luck |
| XI Justice | Air | Libra, balance, truth |
| XII Hanged Man | Water | Neptune, surrender, depth |
| XIII Death | Water | Scorpio, transformation |
| XIV Temperance | Fire | Sagittarius, alchemy |
| XV The Devil | Earth | Capricorn, material bondage |
| XVI The Tower | Fire | Mars, sudden destruction/creation |
| XVII The Star | Air | Aquarius, hope, inspiration |
| XVIII The Moon | Water | Pisces, illusion, dreams |
| XIX The Sun | Fire | Sun, vitality, joy |
| XX Judgement | Fire | Pluto, rebirth, calling |
| XXI The World | Earth | Saturn, completion, mastery |

---

## Notable Card Pairs

### Major Arcana Combinations

| Pair | Meaning | Context |
|------|---------|---------|
| **Fool + World** | Full circle, completion of a journey, ready for new cycle | Transformation complete |
| **Magician + High Priestess** | Masculine + feminine balance, conscious + unconscious harmony | Powerful inner alignment |
| **Empress + Emperor** | Partnership, parental energy, balanced authority + nurturing | Relationship stability |
| **Tower + Star** | Destruction followed by hope, necessary breakdown for renewal | Crisis → healing |
| **Death + Judgement** | Profound transformation, rebirth at soul level | Life-changing transition |
| **Moon + Sun** | Confusion clearing into clarity, darkness before dawn | Things getting better |
| **Devil + Strength** | Overcoming addiction/attachment through inner courage | Breaking free |
| **Hermit + Wheel** | Wisdom gained from solitude changes fortune | Timing is right |
| **Hanged Man + Death** | Deep surrender leads to transformation | Let go completely |
| **Lovers + Devil** | Relationship patterns, healthy vs toxic bonds | Examine partnerships |

### Challenging Combinations

| Pair | Concern | Empowerment Reframe |
|------|---------|---------------------|
| **Tower + Ten of Swords** | Major upheaval + painful ending | "The worst is truly over. Rebuild on solid ground." |
| **Three of Swords + Five of Cups** | Heartbreak + grief | "Allow yourself to grieve. Healing has already begun." |
| **Nine of Swords + Moon** | Anxiety + confusion | "Your fears feel real but may not be. Seek clarity." |
| **Devil + Eight of Swords** | Trapped + restricted | "The chains are looser than they appear. One step frees you." |
| **Five of Pentacles + Ten of Wands** | Financial worry + burden | "Help is available. You don't have to carry this alone." |

### Positive Combinations

| Pair | Meaning |
|------|---------|
| **Sun + Ace of Cups** | Joyful new love or emotional beginning |
| **Star + Nine of Cups** | Wishes fulfilled, hope realized |
| **World + Ten of Pentacles** | Complete success, family prosperity |
| **Empress + Ace of Pentacles** | Abundance and new opportunity flourishing |
| **Magician + Ace of Wands** | Powerful new creative beginning |
| **Strength + Six of Wands** | Courage leads to public recognition |

---

## Suit Combination Patterns

### When Multiple Suits Appear Together

| Combination | Reading Focus |
|-------------|--------------|
| **Wands + Cups** | Passion meets emotion — creative romance, inspired relationships |
| **Wands + Swords** | Action meets thought — strategic plans, decisive action |
| **Wands + Pentacles** | Vision meets reality — business success, manifesting ideas |
| **Cups + Swords** | Heart meets mind — emotional decisions, need for balance |
| **Cups + Pentacles** | Feelings meet finances — emotional security, nurturing wealth |
| **Swords + Pentacles** | Ideas meet earth — practical solutions, grounded thinking |

### Suit Balance Assessment

In any spread, count the suits:

```
All one suit:    Very focused reading; one life area dominates
Two suits:       Two areas interacting; look for harmony or tension
Three suits:     Rich, multi-faceted situation; complex but manageable
All four suits:  Balanced life moment; many areas active simultaneously
No Minor Arcana: Rare; purely spiritual/karmic reading
```

---

## Number Pattern Significance

### Aces (New Beginnings)

| Count | Meaning |
|-------|---------|
| 2 Aces | Two new beginnings — exciting but may need to choose |
| 3 Aces | Abundance of opportunity — stay focused |
| 4 Aces | Extremely rare — monumental new chapter in life |

### Twos (Partnerships & Balance)

| Count | Meaning |
|-------|---------|
| 2+ Twos | Multiple areas needing balance/partnership decisions |

### Threes (Growth & Creativity)

| Count | Meaning |
|-------|---------|
| 2+ Threes | Creative expansion, social growth, collaborative energy |

### Fives (Conflict & Change)

| Count | Meaning |
|-------|---------|
| 2+ Fives | Period of significant challenges; growth through adversity |
| **Crisis note** | Multiple fives require extra sensitivity in reading |

### Tens (Completion)

| Count | Meaning |
|-------|---------|
| 2+ Tens | Multiple life areas reaching completion; major life transition |

---

## Court Card Combinations

### Same Rank Across Suits

| Combination | Meaning |
|-------------|---------|
| Page + Page | Multiple learning opportunities, youthful energy |
| Knight + Knight | Multiple pursuits, need to focus energy |
| Queen + Queen | Powerful feminine energy, nurturing from multiple sources |
| King + King | Authority and mastery, possible conflict of leadership |
| King + Queen (same suit) | Harmonious partnership in that life area |
| King + Queen (different suits) | Partnership bridging different life areas |

### Court Cards as People

When a court card appears near a card that matches a person mentioned in the user's context:
- Check if the court card's suit matches the relationship type
- Cups court → emotional relationships (partners, close friends)
- Pentacles court → practical relationships (business, financial)
- Swords court → intellectual/conflict relationships (rivals, mentors)
- Wands court → creative/passionate relationships (collaborators, inspirers)

---

## Applying Combinations in TarotFriend

### Algorithm for Combination Detection

```typescript
interface CombinationInsight {
  type: 'elemental_dignity' | 'suit_dominance' | 'number_pattern' |
        'major_count' | 'court_pattern' | 'notable_pair';
  cards_involved: string[];
  significance: string;
  interpretation_hint: string;
}

function detectCombinations(cards: DrawnCard[]): CombinationInsight[] {
  const insights: CombinationInsight[] = [];

  // 1. Count Major Arcana
  const majorCount = cards.filter(c => c.arcana_type === 'major').length;
  if (majorCount >= 3) {
    insights.push({
      type: 'major_count',
      cards_involved: cards.filter(c => c.arcana_type === 'major').map(c => c.name),
      significance: 'high',
      interpretation_hint: `${majorCount} Major Arcana cards indicate major life themes at play.`
    });
  }

  // 2. Check suit dominance
  const suitCounts = countBySuit(cards);
  const dominantSuit = findDominant(suitCounts);
  if (dominantSuit && suitCounts[dominantSuit] >= Math.ceil(cards.length / 2)) {
    insights.push({
      type: 'suit_dominance',
      cards_involved: cards.filter(c => c.suit === dominantSuit).map(c => c.name),
      significance: 'medium',
      interpretation_hint: `${dominantSuit} dominates — focus on ${SUIT_THEMES[dominantSuit]}.`
    });
  }

  // 3. Check number repetitions
  const numberCounts = countByNumber(cards);
  for (const [num, count] of Object.entries(numberCounts)) {
    if (count >= 2) {
      insights.push({
        type: 'number_pattern',
        cards_involved: cards.filter(c => c.number === num).map(c => c.name),
        significance: count >= 3 ? 'high' : 'medium',
        interpretation_hint: NUMBER_MEANINGS[num]
      });
    }
  }

  // 4. Check elemental dignity for adjacent cards
  for (let i = 0; i < cards.length - 1; i++) {
    const dignity = checkElementalDignity(cards[i], cards[i + 1]);
    if (dignity !== 'neutral') {
      insights.push({
        type: 'elemental_dignity',
        cards_involved: [cards[i].name, cards[i + 1].name],
        significance: dignity === 'strengthen' ? 'positive' : 'tension',
        interpretation_hint: `${cards[i].name} and ${cards[i + 1].name} ${dignity} each other.`
      });
    }
  }

  return insights;
}
```

### Including Combinations in the Interpretation Prompt

When combinations are detected, add them to the prompt:

```
CARD COMBINATION INSIGHTS:
{{#combination_insights}}
- [{{type}}] {{cards_involved}}: {{interpretation_hint}}
{{/combination_insights}}

Please weave these combination insights naturally into your interpretation.
Don't list them separately — integrate them into the narrative flow.
```
