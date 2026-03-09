/**
 * Customer Service — Unit Tests
 *
 * These tests mock the Prisma client to test business logic in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    customer: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
  disconnectDatabase: vi.fn(),
}));

// Mock kafka
vi.mock('../src/lib/kafka-producer.js', () => ({
  CustomerEvents: {
    created: vi.fn().mockResolvedValue(undefined),
    updated: vi.fn().mockResolvedValue(undefined),
    deleted: vi.fn().mockResolvedValue(undefined),
  },
  eventProducer: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

// Mock logger
vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock cache
vi.mock('../src/lib/cache.js', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn(),
  },
}));

// Mock @tarotfriend/shared
vi.mock('@tarotfriend/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  createHealthCheck: () => ({
    register: vi.fn(),
    check: vi.fn().mockResolvedValue({ status: 'ok' }),
  }),
}));

import { prisma } from '../src/lib/prisma.js';
import { CustomerService } from '../src/services/customer.service.js';

const service = new CustomerService();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CustomerService.create', () => {
  it('creates a customer with metaphysical fields when birthDate provided', async () => {
    const mockCustomer = {
      id: 'test-uuid',
      email: 'test@example.com',
      displayName: 'Test User',
      phone: null,
      locale: 'zh-TW',
      tier: 'free',
      status: 'active',
      birthDate: '1990-05-15',
      birthTime: null,
      birthCity: null,
      birthLat: null,
      birthLng: null,
      zodiacSign: '金牛座',
      chineseZodiac: '庚午馬年',
      fiveElement: '金',
      occupation: null,
      industry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.customer.create).mockResolvedValue(mockCustomer);

    const result = await service.create({
      email: 'test@example.com',
      displayName: 'Test User',
      birthDate: '1990-05-15',
    });

    expect(result.email).toBe('test@example.com');
    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'test@example.com',
        displayName: 'Test User',
        birthDate: '1990-05-15',
        zodiacSign: '金牛座',
        fiveElement: '金',
      }),
    });
  });

  it('creates a customer without metaphysical fields when no birthDate', async () => {
    const mockCustomer = {
      id: 'test-uuid',
      email: 'no-birth@example.com',
      displayName: 'No Birth',
      phone: null,
      locale: 'zh-TW',
      tier: 'free',
      status: 'active',
      birthDate: null,
      birthTime: null,
      birthCity: null,
      birthLat: null,
      birthLng: null,
      zodiacSign: null,
      chineseZodiac: null,
      fiveElement: null,
      occupation: null,
      industry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.customer.create).mockResolvedValue(mockCustomer);

    await service.create({
      email: 'no-birth@example.com',
      displayName: 'No Birth',
    });

    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        zodiacSign: undefined,
        chineseZodiac: undefined,
        fiveElement: undefined,
      }),
    });
  });
});

describe('CustomerService.findById', () => {
  it('returns customer with relations when found', async () => {
    const mockCustomer = {
      id: 'test-uuid',
      email: 'test@example.com',
      displayName: 'Test',
      contacts: [],
      tags: [],
      _count: { contacts: 0, financeRecords: 0, birthCharts: 0 },
    };

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as any);

    const result = await service.findById('test-uuid');
    expect(result.id).toBe('test-uuid');
  });

  it('throws NOT_FOUND when customer does not exist', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

    await expect(service.findById('nonexistent'))
      .rejects.toThrow('Customer not found');
  });
});

describe('CustomerService.update', () => {
  it('re-calculates metaphysical fields when birthDate changes', async () => {
    const existing = {
      id: 'test-uuid',
      email: 'test@example.com',
      displayName: 'Test',
      birthDate: '1990-05-15',
    };

    vi.mocked(prisma.customer.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.customer.update).mockResolvedValue({
      ...existing,
      birthDate: '1985-03-21',
      zodiacSign: '牡羊座',
      chineseZodiac: expect.any(String),
      fiveElement: '木',
    } as any);

    await service.update('test-uuid', { birthDate: '1985-03-21' });

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'test-uuid' },
      data: expect.objectContaining({
        birthDate: '1985-03-21',
        zodiacSign: '牡羊座',
        fiveElement: '木',
      }),
    });
  });

  it('clears metaphysical fields when birthDate set to null', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({ id: 'test-uuid' } as any);
    vi.mocked(prisma.customer.update).mockResolvedValue({} as any);

    await service.update('test-uuid', { birthDate: null });

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'test-uuid' },
      data: expect.objectContaining({
        birthDate: null,
        zodiacSign: null,
        chineseZodiac: null,
        fiveElement: null,
      }),
    });
  });
});

describe('CustomerService.softDelete', () => {
  it('sets status to deleted', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({ id: 'test-uuid' } as any);
    vi.mocked(prisma.customer.update).mockResolvedValue({ id: 'test-uuid', status: 'deleted' } as any);

    const result = await service.softDelete('test-uuid');
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'test-uuid' },
      data: { status: 'deleted' },
    });
  });

  it('throws NOT_FOUND for non-existent customer', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

    await expect(service.softDelete('nonexistent'))
      .rejects.toThrow('Customer not found');
  });
});
