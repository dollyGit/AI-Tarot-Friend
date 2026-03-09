/**
 * Finance Service — Transaction Records (P2.3)
 */
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { CustomerEvents } from '../lib/kafka-producer.js';
import { errors } from '../api/middleware/error-handler.js';
import type { CreateFinanceRecordInput } from '../api/validators/customer.validator.js';

export class FinanceService {
  /**
   * Record a financial transaction for a customer.
   */
  async create(customerId: string, data: CreateFinanceRecordInput, userId?: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const record = await prisma.financeRecord.create({
      data: {
        customerId,
        type: data.type,
        amount: new Decimal(data.amount),
        currency: data.currency,
        referenceId: data.referenceId,
        description: data.description,
        status: data.status,
      },
    });

    logger.info(
      { customerId, recordId: record.id, type: data.type, amount: data.amount },
      'Finance record created',
    );

    CustomerEvents.financeRecorded(customerId, {
      recordId: record.id,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
    }, userId).catch(() => {});

    return record;
  }

  /**
   * List finance records for a customer with optional type filter and pagination.
   */
  async list(
    customerId: string,
    options: { type?: string; page?: number; limit?: number } = {},
  ) {
    const { type, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const where: { customerId: string; type?: string } = { customerId };
    if (type) where.type = type;

    const [records, total] = await Promise.all([
      prisma.financeRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.financeRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a summary of a customer's financial activity.
   */
  async getSummary(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const records = await prisma.financeRecord.findMany({
      where: { customerId, status: 'completed' },
    });

    const summary = {
      totalPurchases: new Decimal(0),
      totalRefunds: new Decimal(0),
      totalTopUps: new Decimal(0),
      transactionCount: records.length,
    };

    for (const record of records) {
      switch (record.type) {
        case 'purchase':
        case 'subscription':
          summary.totalPurchases = summary.totalPurchases.add(record.amount);
          break;
        case 'refund':
          summary.totalRefunds = summary.totalRefunds.add(record.amount);
          break;
        case 'top_up':
          summary.totalTopUps = summary.totalTopUps.add(record.amount);
          break;
      }
    }

    return {
      ...summary,
      totalPurchases: summary.totalPurchases.toString(),
      totalRefunds: summary.totalRefunds.toString(),
      totalTopUps: summary.totalTopUps.toString(),
    };
  }
}

export const financeService = new FinanceService();
