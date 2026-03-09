import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { cache } from '../src/lib/cache';

// Setup before all tests
beforeAll(async () => {
  // Ensure test database is clean
  process.env.NODE_ENV = 'test';

  // Connect to test database
  await prisma.$connect();
});

// Cleanup after each test
beforeEach(async () => {
  // Clear Redis cache
  await cache.getClient().flushdb();
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();

  // Close Redis connection
  await cache.close();
});

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-secret-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
