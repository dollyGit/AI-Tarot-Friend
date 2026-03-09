#!/usr/bin/env tsx
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const PLANS = [
  {
    name: 'free',
    display_name_en: 'Free Tier',
    display_name_zh: '免費方案',
    price_cents: 0,
    currency: 'USD',
    interval: null,
    features: {
      single_card_daily: 3,
      three_card_daily: 1,
      seven_card_daily: 0,
      celtic_cross_daily: 0,
      unlimited: false,
      theme_packs: false,
      priority_queue: false,
      multi_device_sync: false,
    },
    stripe_price_id: null,
    active: true,
  },
  {
    name: 'premium-monthly',
    display_name_en: 'Premium Monthly',
    display_name_zh: '高級月費',
    price_cents: 999, // $9.99
    currency: 'USD',
    interval: 'month',
    features: {
      single_card_daily: -1, // -1 means unlimited
      three_card_daily: -1,
      seven_card_daily: -1,
      celtic_cross_daily: -1,
      unlimited: true,
      theme_packs: true,
      priority_queue: true,
      multi_device_sync: true,
    },
    stripe_price_id: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || null,
    active: true,
  },
  {
    name: 'premium-yearly',
    display_name_en: 'Premium Yearly',
    display_name_zh: '高級年費',
    price_cents: 9999, // $99.99 (2 months free)
    currency: 'USD',
    interval: 'year',
    features: {
      single_card_daily: -1,
      three_card_daily: -1,
      seven_card_daily: -1,
      celtic_cross_daily: -1,
      unlimited: true,
      theme_packs: true,
      priority_queue: true,
      multi_device_sync: true,
    },
    stripe_price_id: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || null,
    active: true,
  },
];

async function seedPlans() {
  try {
    logger.info('Starting plans seed...');

    const existingCount = await prisma.plan.count();
    if (existingCount > 0) {
      logger.info({ count: existingCount }, 'Plans already seeded, skipping');
      return;
    }

    for (const plan of PLANS) {
      await prisma.plan.create({ data: plan });
    }

    logger.info({ count: PLANS.length }, 'Plans seeded successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to seed plans');
    throw err;
  }
}

if (require.main === module) {
  seedPlans()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { seedPlans };
