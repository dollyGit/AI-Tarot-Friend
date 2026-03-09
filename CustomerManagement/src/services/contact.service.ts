/**
 * Contact Service — Relationship Circle Management (P2.2)
 */
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { CustomerEvents } from '../lib/kafka-producer.js';
import { calculateAllMetaphysical } from '../utils/metaphysical.js';
import type {
  CreateContactInput,
  UpdateContactInput,
} from '../api/validators/customer.validator.js';
import { errors } from '../api/middleware/error-handler.js';

export class ContactService {
  /**
   * Add a contact to a customer's relationship circle.
   * Auto-calculates metaphysical fields for the contact if birthDate provided.
   */
  async addContact(customerId: string, data: CreateContactInput, userId?: string) {
    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const contact = await prisma.customerContact.create({
      data: {
        customerId,
        nickname: data.nickname,
        relationship: data.relationship,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthCity: data.birthCity,
        notes: data.notes,
      },
    });

    logger.info({ customerId, contactId: contact.id }, 'Contact added');

    // Calculate metaphysical for response enrichment
    const metaphysical = data.birthDate
      ? calculateAllMetaphysical(data.birthDate)
      : null;

    CustomerEvents.contactAdded(customerId, {
      contactId: contact.id,
      nickname: contact.nickname,
      relationship: contact.relationship,
    }, userId).catch(() => {});

    return { ...contact, metaphysical };
  }

  /**
   * List all contacts for a customer.
   */
  async listContacts(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    const contacts = await prisma.customerContact.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with calculated metaphysical fields
    return contacts.map((contact) => ({
      ...contact,
      metaphysical: contact.birthDate
        ? calculateAllMetaphysical(contact.birthDate)
        : null,
    }));
  }

  /**
   * Update a specific contact.
   */
  async updateContact(
    customerId: string,
    contactId: string,
    data: UpdateContactInput,
    userId?: string,
  ) {
    const contact = await prisma.customerContact.findFirst({
      where: { id: contactId, customerId },
    });
    if (!contact) throw errors.notFound('Contact');

    const updated = await prisma.customerContact.update({
      where: { id: contactId },
      data,
    });

    logger.info({ customerId, contactId }, 'Contact updated');

    CustomerEvents.contactUpdated(customerId, {
      contactId,
      changes: data,
    }, userId).catch(() => {});

    return {
      ...updated,
      metaphysical: updated.birthDate
        ? calculateAllMetaphysical(updated.birthDate)
        : null,
    };
  }

  /**
   * Remove a contact from the relationship circle.
   */
  async removeContact(customerId: string, contactId: string) {
    const contact = await prisma.customerContact.findFirst({
      where: { id: contactId, customerId },
    });
    if (!contact) throw errors.notFound('Contact');

    await prisma.customerContact.delete({ where: { id: contactId } });

    logger.info({ customerId, contactId }, 'Contact removed');

    return { success: true };
  }
}

export const contactService = new ContactService();
