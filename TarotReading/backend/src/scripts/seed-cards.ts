#!/usr/bin/env tsx
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const TAROT_CARDS = [
  // Major Arcana (0-21)
  {
    order: 0,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Fool',
    name_zh: '愚者',
    upright_meaning: 'New beginnings, innocence, spontaneity, a free spirit, adventure, taking a leap of faith.',
    reversed_meaning: 'Recklessness, taken advantage of, inconsideration, risk-taking without preparation.',
  },
  {
    order: 1,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Magician',
    name_zh: '魔術師',
    upright_meaning: 'Manifestation, resourcefulness, power, inspired action, taking initiative, skill.',
    reversed_meaning: 'Manipulation, poor planning, untapped talents, illusions, deception.',
  },
  {
    order: 2,
    arcana_type: 'major',
    suit: null,
    name_en: 'The High Priestess',
    name_zh: '女祭司',
    upright_meaning: 'Intuition, sacred knowledge, divine feminine, the subconscious mind, inner voice.',
    reversed_meaning: 'Secrets, disconnected from intuition, withdrawal, silence, repressed feelings.',
  },
  {
    order: 3,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Empress',
    name_zh: '皇后',
    upright_meaning: 'Femininity, beauty, nature, nurturing, abundance, creativity, birth.',
    reversed_meaning: 'Creative block, dependence on others, smothering, lack of growth.',
  },
  {
    order: 4,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Emperor',
    name_zh: '皇帝',
    upright_meaning: 'Authority, establishment, structure, a father figure, leadership, control.',
    reversed_meaning: 'Domination, excessive control, lack of discipline, inflexibility, tyranny.',
  },
  {
    order: 5,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Hierophant',
    name_zh: '教皇',
    upright_meaning: 'Spiritual wisdom, religious beliefs, conformity, tradition, institutions, learning.',
    reversed_meaning: 'Personal beliefs, freedom, challenging the status quo, unconventional.',
  },
  {
    order: 6,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Lovers',
    name_zh: '戀人',
    upright_meaning: 'Love, harmony, relationships, values alignment, choices, union, partnerships.',
    reversed_meaning: 'Self-love, disharmony, imbalance, misalignment of values, bad choices.',
  },
  {
    order: 7,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Chariot',
    name_zh: '戰車',
    upright_meaning: 'Control, willpower, success, action, determination, forward movement.',
    reversed_meaning: 'Self-discipline, opposition, lack of direction, scattered energy.',
  },
  {
    order: 8,
    arcana_type: 'major',
    suit: null,
    name_en: 'Strength',
    name_zh: '力量',
    upright_meaning: 'Strength, courage, persuasion, influence, compassion, inner power, patience.',
    reversed_meaning: 'Inner strength, self-doubt, low energy, raw emotion, lack of confidence.',
  },
  {
    order: 9,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Hermit',
    name_zh: '隱士',
    upright_meaning: 'Soul-searching, introspection, being alone, inner guidance, contemplation.',
    reversed_meaning: 'Isolation, loneliness, withdrawal, social anxiety, paranoia.',
  },
  {
    order: 10,
    arcana_type: 'major',
    suit: null,
    name_en: 'Wheel of Fortune',
    name_zh: '命運之輪',
    upright_meaning: 'Good luck, karma, life cycles, destiny, a turning point, change.',
    reversed_meaning: 'Bad luck, resistance to change, breaking cycles, setbacks.',
  },
  {
    order: 11,
    arcana_type: 'major',
    suit: null,
    name_en: 'Justice',
    name_zh: '正義',
    upright_meaning: 'Justice, fairness, truth, cause and effect, law, integrity, balance.',
    reversed_meaning: 'Unfairness, lack of accountability, dishonesty, bias, legal complications.',
  },
  {
    order: 12,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Hanged Man',
    name_zh: '倒吊人',
    upright_meaning: 'Pause, surrender, letting go, new perspectives, sacrifice, waiting.',
    reversed_meaning: 'Delays, resistance, stalling, indecision, avoiding sacrifice.',
  },
  {
    order: 13,
    arcana_type: 'major',
    suit: null,
    name_en: 'Death',
    name_zh: '死神',
    upright_meaning: 'Endings, change, transformation, transition, letting go, renewal.',
    reversed_meaning: 'Resistance to change, personal transformation, inner purging, stagnation.',
  },
  {
    order: 14,
    arcana_type: 'major',
    suit: null,
    name_en: 'Temperance',
    name_zh: '節制',
    upright_meaning: 'Balance, moderation, patience, purpose, harmony, tranquility, middle path.',
    reversed_meaning: 'Imbalance, excess, self-healing, re-alignment, hasty decisions.',
  },
  {
    order: 15,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Devil',
    name_zh: '惡魔',
    upright_meaning: 'Shadow self, attachment, addiction, restriction, sexuality, materialism.',
    reversed_meaning: 'Releasing limiting beliefs, exploring dark thoughts, detachment, freedom.',
  },
  {
    order: 16,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Tower',
    name_zh: '高塔',
    upright_meaning: 'Sudden change, upheaval, chaos, revelation, awakening, disruption.',
    reversed_meaning: 'Personal transformation, fear of change, averting disaster, delayed disaster.',
  },
  {
    order: 17,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Star',
    name_zh: '星星',
    upright_meaning: 'Hope, faith, purpose, renewal, spirituality, inspiration, serenity.',
    reversed_meaning: 'Lack of faith, despair, self-trust, disconnection, discouragement.',
  },
  {
    order: 18,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Moon',
    name_zh: '月亮',
    upright_meaning: 'Illusion, fear, anxiety, subconscious, intuition, dreams, uncertainty.',
    reversed_meaning: 'Release of fear, repressed emotion, inner confusion, clarity emerging.',
  },
  {
    order: 19,
    arcana_type: 'major',
    suit: null,
    name_en: 'The Sun',
    name_zh: '太陽',
    upright_meaning: 'Positivity, fun, warmth, success, vitality, joy, optimism, celebration.',
    reversed_meaning: 'Inner child, feeling down, overly optimistic, temporary depression.',
  },
  {
    order: 20,
    arcana_type: 'major',
    suit: null,
    name_en: 'Judgement',
    name_zh: '審判',
    upright_meaning: 'Judgement, rebirth, inner calling, absolution, reflection, reckoning.',
    reversed_meaning: 'Self-doubt, inner critic, ignoring the call, lack of self-awareness.',
  },
  {
    order: 21,
    arcana_type: 'major',
    suit: null,
    name_en: 'The World',
    name_zh: '世界',
    upright_meaning: 'Completion, integration, accomplishment, travel, fulfillment, wholeness.',
    reversed_meaning: 'Seeking personal closure, short-cuts, delays, incomplete goals.',
  },

  // Minor Arcana - Wands (22-35)
  ...Array.from({ length: 14 }, (_, i) => {
    const rank = i + 1;
    const rankName = rank === 1 ? 'Ace' : rank === 11 ? 'Page' : rank === 12 ? 'Knight' : rank === 13 ? 'Queen' : rank === 14 ? 'King' : rank.toString();
    const rankZh = rank === 1 ? '王牌' : rank === 11 ? '侍從' : rank === 12 ? '騎士' : rank === 13 ? '王后' : rank === 14 ? '國王' : rank.toString();

    return {
      order: 21 + i,
      arcana_type: 'minor',
      suit: 'wands',
      name_en: `${rankName} of Wands`,
      name_zh: `權杖${rankZh}`,
      upright_meaning: rank === 1 ? 'Inspiration, new opportunities, growth, potential' :
                        rank === 11 ? 'Exploration, excitement, adventure, discovery' :
                        'Passion, creativity, willpower, energy, ambition',
      reversed_meaning: 'Delays, frustration, lack of direction, creative blocks',
    };
  }),

  // Minor Arcana - Cups (36-49)
  ...Array.from({ length: 14 }, (_, i) => {
    const rank = i + 1;
    const rankName = rank === 1 ? 'Ace' : rank === 11 ? 'Page' : rank === 12 ? 'Knight' : rank === 13 ? 'Queen' : rank === 14 ? 'King' : rank.toString();
    const rankZh = rank === 1 ? '王牌' : rank === 11 ? '侍從' : rank === 12 ? '騎士' : rank === 13 ? '王后' : rank === 14 ? '國王' : rank.toString();

    return {
      order: 35 + i,
      arcana_type: 'minor',
      suit: 'cups',
      name_en: `${rankName} of Cups`,
      name_zh: `聖杯${rankZh}`,
      upright_meaning: rank === 1 ? 'Love, new relationships, compassion, creativity' :
                        rank === 11 ? 'Creative opportunities, intuitive messages, curiosity' :
                        'Emotions, relationships, intuition, feelings, connection',
      reversed_meaning: 'Repressed emotions, emotional loss, blocked creativity',
    };
  }),

  // Minor Arcana - Swords (50-63)
  ...Array.from({ length: 14 }, (_, i) => {
    const rank = i + 1;
    const rankName = rank === 1 ? 'Ace' : rank === 11 ? 'Page' : rank === 12 ? 'Knight' : rank === 13 ? 'Queen' : rank === 14 ? 'King' : rank.toString();
    const rankZh = rank === 1 ? '王牌' : rank === 11 ? '侍從' : rank === 12 ? '騎士' : rank === 13 ? '王后' : rank === 14 ? '國王' : rank.toString();

    return {
      order: 49 + i,
      arcana_type: 'minor',
      suit: 'swords',
      name_en: `${rankName} of Swords`,
      name_zh: `寶劍${rankZh}`,
      upright_meaning: rank === 1 ? 'Breakthroughs, new ideas, mental clarity, success' :
                        rank === 11 ? 'New ideas, curiosity, thirst for knowledge, vigilance' :
                        'Intellect, thoughts, communication, conflict, truth',
      reversed_meaning: 'Confusion, harsh judgment, inner critic, communication blocks',
    };
  }),

  // Minor Arcana - Pentacles (64-77)
  ...Array.from({ length: 14 }, (_, i) => {
    const rank = i + 1;
    const rankName = rank === 1 ? 'Ace' : rank === 11 ? 'Page' : rank === 12 ? 'Knight' : rank === 13 ? 'Queen' : rank === 14 ? 'King' : rank.toString();
    const rankZh = rank === 1 ? '王牌' : rank === 11 ? '侍從' : rank === 12 ? '騎士' : rank === 13 ? '王后' : rank === 14 ? '國王' : rank.toString();

    return {
      order: 63 + i,
      arcana_type: 'minor',
      suit: 'pentacles',
      name_en: `${rankName} of Pentacles`,
      name_zh: `錢幣${rankZh}`,
      upright_meaning: rank === 1 ? 'Opportunity, prosperity, new venture, manifestation' :
                        rank === 11 ? 'Manifestation, financial opportunity, skill development' :
                        'Material world, finances, career, practical matters, security',
      reversed_meaning: 'Financial loss, lack of planning, missed opportunities, materialism',
    };
  }),
];

async function seedCards() {
  try {
    logger.info('Starting card seed...');

    // Check if cards already exist
    const existingCount = await prisma.card.count();
    if (existingCount > 0) {
      logger.info({ count: existingCount }, 'Cards already seeded, skipping');
      return;
    }

    // Insert all cards
    const result = await prisma.card.createMany({
      data: TAROT_CARDS,
      skipDuplicates: true,
    });

    logger.info({ count: result.count }, 'Cards seeded successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to seed cards');
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  seedCards()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { seedCards };
