/**
 * Customer Service — CRUD + Metaphysical Calculations (P2.1)
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { CustomerEvents } from '../lib/kafka-producer.js';
import { calculateAllMetaphysical } from '../utils/metaphysical.js';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerListQuery,
} from '../api/validators/customer.validator.js';
import { errors } from '../api/middleware/error-handler.js';

export class CustomerService {
  /**
   * Create a new customer with auto-calculated metaphysical fields.
   */
  async create(data: CreateCustomerInput, userId?: string) {
    const metaphysical = data.birthDate
      ? calculateAllMetaphysical(data.birthDate)
      : null;

    const customer = await prisma.customer.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        phone: data.phone,
        locale: data.locale,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthCity: data.birthCity,
        birthLat: data.birthLat,
        birthLng: data.birthLng,
        occupation: data.occupation,
        industry: data.industry,
        zodiacSign: metaphysical?.zodiacSign,
        chineseZodiac: metaphysical?.chineseZodiac,
        fiveElement: metaphysical?.fiveElement,
      },
    });

    logger.info({ customerId: customer.id }, 'Customer created');

    // Fire-and-forget Kafka event
    CustomerEvents.created(customer.id, {
      email: customer.email,
      displayName: customer.displayName,
      tier: customer.tier,
    }, userId).catch(() => {});

    return customer;
  }

  /**
   * Find a customer by ID with optional relations.
   */
  async findById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: true,
        tags: { include: { tag: true } },
        _count: { select: { contacts: true, financeRecords: true, birthCharts: true } },
      },
    });

    if (!customer) {
      throw errors.notFound('Customer');
    }

    return customer;
  }

  /**
   * Find a customer by email.
   */
  async findByEmail(email: string) {
    return prisma.customer.findUnique({ where: { email } });
  }

  /**
   * List customers with pagination, filtering, and sorting.
   */
  async list(query: CustomerListQuery) {
    const { page, limit, status, tier, email, search, tag, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (status) where.status = status;
    if (tier) where.tier = tier;
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          tags: { include: { tag: true } },
          _count: { select: { contacts: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a customer. Re-calculates metaphysical fields if birthDate changes.
   */
  async update(id: string, data: UpdateCustomerInput, userId?: string) {
    // Check existence
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw errors.notFound('Customer');

    // Re-calculate metaphysical if birthDate is being updated
    const updateData: Prisma.CustomerUpdateInput = { ...data };

    if (data.birthDate !== undefined) {
      if (data.birthDate) {
        const metaphysical = calculateAllMetaphysical(data.birthDate);
        if (metaphysical) {
          updateData.zodiacSign = metaphysical.zodiacSign;
          updateData.chineseZodiac = metaphysical.chineseZodiac;
          updateData.fiveElement = metaphysical.fiveElement;
        }
      } else {
        // Birth date cleared — clear derived fields
        updateData.zodiacSign = null;
        updateData.chineseZodiac = null;
        updateData.fiveElement = null;
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    logger.info({ customerId: id }, 'Customer updated');

    CustomerEvents.updated(id, data as Record<string, unknown>, userId).catch(() => {});

    return customer;
  }

  /**
   * Soft delete a customer (set status = 'deleted').
   */
  async softDelete(id: string, userId?: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw errors.notFound('Customer');

    const customer = await prisma.customer.update({
      where: { id },
      data: { status: 'deleted' },
    });

    logger.info({ customerId: id }, 'Customer soft-deleted');

    CustomerEvents.deleted(id, userId).catch(() => {});

    return customer;
  }

  /**
   * Get slim customer profile for internal service-to-service calls.
   */
  async getProfile(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        locale: true,
        tier: true,
        status: true,
        birthDate: true,
        zodiacSign: true,
        chineseZodiac: true,
        fiveElement: true,
        occupation: true,
        industry: true,
      },
    });

    if (!customer) throw errors.notFound('Customer');

    return customer;
  }
}

export const customerService = new CustomerService();
