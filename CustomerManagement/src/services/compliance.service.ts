/**
 * Compliance Service — Consent + Notes (P2.3)
 */
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { errors } from '../api/middleware/error-handler.js';
import type { CreateConsentInput, CreateNoteInput } from '../api/validators/customer.validator.js';

export class ComplianceService {
  // ── Consent Management ──────────────────────────────────

  /**
   * Record or update a consent decision (GDPR / marketing).
   * Uses upsert on (customerId, consentType) unique constraint.
   */
  async recordConsent(customerId: string, data: CreateConsentInput) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const now = new Date();
    const consent = await prisma.customerConsent.upsert({
      where: {
        customerId_consentType: {
          customerId,
          consentType: data.consentType,
        },
      },
      create: {
        customerId,
        consentType: data.consentType,
        granted: data.granted,
        grantedAt: data.granted ? now : null,
        revokedAt: data.granted ? null : now,
        ipAddress: data.ipAddress,
      },
      update: {
        granted: data.granted,
        grantedAt: data.granted ? now : undefined,
        revokedAt: data.granted ? null : now,
        ipAddress: data.ipAddress,
      },
    });

    logger.info(
      { customerId, consentType: data.consentType, granted: data.granted },
      'Consent recorded',
    );

    return consent;
  }

  /**
   * List all consent records for a customer.
   */
  async listConsents(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    return prisma.customerConsent.findMany({
      where: { customerId },
      orderBy: { consentType: 'asc' },
    });
  }

  // ── Customer Notes ──────────────────────────────────────

  /**
   * Add a customer service note.
   */
  async addNote(customerId: string, data: CreateNoteInput, authorId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const note = await prisma.customerNote.create({
      data: {
        customerId,
        authorId,
        content: data.content,
        category: data.category,
      },
    });

    logger.info({ customerId, noteId: note.id, category: data.category }, 'Note added');

    return note;
  }

  /**
   * List notes for a customer with optional category filter.
   */
  async listNotes(customerId: string, category?: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const where: { customerId: string; category?: string } = { customerId };
    if (category) where.category = category;

    return prisma.customerNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const complianceService = new ComplianceService();
