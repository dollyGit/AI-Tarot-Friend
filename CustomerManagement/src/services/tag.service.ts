/**
 * Tag Service — M:N Tag Management with Filtering (P2.4)
 */
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { errors } from '../api/middleware/error-handler.js';
import type { CreateTagInput } from '../api/validators/customer.validator.js';

export class TagService {
  /**
   * Create a new global tag definition.
   */
  async createTag(data: CreateTagInput) {
    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        category: data.category,
        color: data.color,
      },
    });

    logger.info({ tagId: tag.id, name: tag.name }, 'Tag created');
    return tag;
  }

  /**
   * List all available tags, optionally filtered by category.
   */
  async listTags(category?: string) {
    const where: { category?: string } = {};
    if (category) where.category = category;

    return prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { customers: true } },
      },
    });
  }

  /**
   * Assign a tag to a customer.
   */
  async assignTag(customerId: string, tagId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) throw errors.notFound('Tag');

    // Check if already assigned (unique constraint will catch, but better UX)
    const existing = await prisma.customerTag.findUnique({
      where: { customerId_tagId: { customerId, tagId } },
    });
    if (existing) {
      throw errors.conflict('Tag already assigned to this customer');
    }

    const customerTag = await prisma.customerTag.create({
      data: { customerId, tagId },
      include: { tag: true },
    });

    logger.info({ customerId, tagId, tagName: tag.name }, 'Tag assigned');
    return customerTag;
  }

  /**
   * Remove a tag from a customer.
   */
  async removeTag(customerId: string, tagId: string) {
    const customerTag = await prisma.customerTag.findUnique({
      where: { customerId_tagId: { customerId, tagId } },
    });
    if (!customerTag) throw errors.notFound('Customer tag assignment');

    await prisma.customerTag.delete({
      where: { customerId_tagId: { customerId, tagId } },
    });

    logger.info({ customerId, tagId }, 'Tag removed');
    return { success: true };
  }

  /**
   * Get all tags assigned to a customer.
   */
  async getCustomerTags(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const customerTags = await prisma.customerTag.findMany({
      where: { customerId },
      include: { tag: true },
      orderBy: { createdAt: 'desc' },
    });

    return customerTags.map((ct) => ct.tag);
  }
}

export const tagService = new TagService();
