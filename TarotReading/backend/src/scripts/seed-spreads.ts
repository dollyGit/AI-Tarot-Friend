#!/usr/bin/env tsx
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const SPREADS = [
  {
    name: '1-card',
    display_name_en: 'Single Card Reading',
    display_name_zh: '單張牌解讀',
    card_count: 1,
    premium_only: false,
    position_meanings: [
      {
        position: 1,
        meaning_en: 'The situation or guidance',
        meaning_zh: '情況或指引',
      },
    ],
  },
  {
    name: '3-card',
    display_name_en: 'Past-Present-Future',
    display_name_zh: '過去-現在-未來',
    card_count: 3,
    premium_only: false,
    position_meanings: [
      { position: 1, meaning_en: 'Past influences', meaning_zh: '過去的影響' },
      { position: 2, meaning_en: 'Present situation', meaning_zh: '現在的情況' },
      { position: 3, meaning_en: 'Future outcome', meaning_zh: '未來的結果' },
    ],
  },
  {
    name: '7-card',
    display_name_en: 'Relationship Spread',
    display_name_zh: '關係牌陣',
    card_count: 7,
    premium_only: true,
    position_meanings: [
      { position: 1, meaning_en: 'You', meaning_zh: '你自己' },
      { position: 2, meaning_en: 'The other person', meaning_zh: '對方' },
      { position: 3, meaning_en: 'Your connection', meaning_zh: '你們的連結' },
      { position: 4, meaning_en: 'Your needs', meaning_zh: '你的需求' },
      { position: 5, meaning_en: 'Their needs', meaning_zh: '對方的需求' },
      { position: 6, meaning_en: 'Challenges', meaning_zh: '挑戰' },
      { position: 7, meaning_en: 'Outcome', meaning_zh: '結果' },
    ],
  },
  {
    name: 'celtic-cross',
    display_name_en: 'Celtic Cross',
    display_name_zh: '凱爾特十字',
    card_count: 10,
    premium_only: true,
    position_meanings: [
      { position: 1, meaning_en: 'Present situation', meaning_zh: '當前情況' },
      { position: 2, meaning_en: 'Challenge', meaning_zh: '挑戰' },
      { position: 3, meaning_en: 'Past', meaning_zh: '過去' },
      { position: 4, meaning_en: 'Future', meaning_zh: '未來' },
      { position: 5, meaning_en: 'Above (goal)', meaning_zh: '上方（目標）' },
      { position: 6, meaning_en: 'Below (foundation)', meaning_zh: '下方（基礎）' },
      { position: 7, meaning_en: 'Advice', meaning_zh: '建議' },
      { position: 8, meaning_en: 'External influences', meaning_zh: '外部影響' },
      { position: 9, meaning_en: 'Hopes and fears', meaning_zh: '希望與恐懼' },
      { position: 10, meaning_en: 'Outcome', meaning_zh: '結果' },
    ],
  },
];

async function seedSpreads() {
  try {
    logger.info('Starting spreads seed...');

    const existingCount = await prisma.spread.count();
    if (existingCount > 0) {
      logger.info({ count: existingCount }, 'Spreads already seeded, skipping');
      return;
    }

    for (const spread of SPREADS) {
      await prisma.spread.create({ data: spread });
    }

    logger.info({ count: SPREADS.length }, 'Spreads seeded successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to seed spreads');
    throw err;
  }
}

if (require.main === module) {
  seedSpreads()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { seedSpreads };
