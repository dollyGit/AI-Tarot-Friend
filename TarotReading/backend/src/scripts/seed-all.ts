#!/usr/bin/env tsx
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { seedCards } from './seed-cards';
import { seedSpreads } from './seed-spreads';
import { seedPlans } from './seed-plans';

async function seedAll() {
  try {
    logger.info('Starting database seeding...');

    // Ensure database connection
    await prisma.$connect();

    // Run all seed scripts in order
    await seedCards();
    await seedSpreads();
    await seedPlans();

    logger.info('✅ All seed data loaded successfully');
  } catch (err) {
    logger.error({ err }, 'Seeding failed');
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

seedAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
