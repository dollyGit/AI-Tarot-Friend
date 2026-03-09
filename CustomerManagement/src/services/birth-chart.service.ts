/**
 * Birth Chart Service — Chart Index Management (P2.3)
 */
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { errors } from '../api/middleware/error-handler.js';
import type { CreateBirthChartInput } from '../api/validators/customer.validator.js';

export class BirthChartService {
  /**
   * Index a birth chart for a customer.
   * The chart body is stored in MongoDB (Phase 3.1) — we store only the reference here.
   */
  async create(customerId: string, data: CreateBirthChartInput) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    // Validate contactId if ownerType is 'contact'
    if (data.ownerType === 'contact') {
      if (!data.contactId) {
        throw errors.badRequest('contactId is required when ownerType is contact');
      }
      const contact = await prisma.customerContact.findFirst({
        where: { id: data.contactId, customerId },
      });
      if (!contact) throw errors.notFound('Contact');
    }

    // Validate partnerId for synastry charts
    if (data.chartType === 'synastry' && !data.partnerId) {
      throw errors.badRequest('partnerId is required for synastry charts');
    }

    const chart = await prisma.customerBirthChart.create({
      data: {
        customerId,
        ownerType: data.ownerType,
        contactId: data.contactId,
        chartType: data.chartType,
        partnerId: data.partnerId,
        documentRef: data.documentRef,
      },
    });

    logger.info({ customerId, chartId: chart.id, chartType: data.chartType }, 'Birth chart indexed');

    return chart;
  }

  /**
   * List all birth charts for a customer, optionally filtered by chart type.
   */
  async list(customerId: string, chartType?: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const where: { customerId: string; chartType?: string } = { customerId };
    if (chartType) where.chartType = chartType;

    return prisma.customerBirthChart.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific birth chart by ID.
   */
  async findById(customerId: string, chartId: string) {
    const chart = await prisma.customerBirthChart.findFirst({
      where: { id: chartId, customerId },
    });
    if (!chart) throw errors.notFound('Birth chart');
    return chart;
  }
}

export const birthChartService = new BirthChartService();
