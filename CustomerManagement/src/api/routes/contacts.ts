/**
 * Contact Routes — Relationship Circle (P2.2)
 */
import { Router } from 'express';
import { contactService } from '../../services/contact.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import {
  createContactSchema,
  updateContactSchema,
  uuidParamSchema,
} from '../validators/customer.validator.js';
import { z } from 'zod';

const router = Router({ mergeParams: true }); // Inherit :customerId from parent

const contactParamsSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
});

/**
 * POST /api/v1/customers/:id/contacts
 */
router.post(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const data = createContactSchema.parse(req.body);
    const contact = await contactService.addContact(id, data, req.user?.userId);
    res.status(201).json({ success: true, data: contact });
  }),
);

/**
 * GET /api/v1/customers/:id/contacts
 */
router.get(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const contacts = await contactService.listContacts(id);
    res.json({ success: true, data: contacts });
  }),
);

/**
 * PATCH /api/v1/customers/:id/contacts/:contactId
 */
router.patch(
  '/:contactId',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id, contactId } = contactParamsSchema.parse(req.params);
    const data = updateContactSchema.parse(req.body);
    const contact = await contactService.updateContact(id, contactId, data, req.user?.userId);
    res.json({ success: true, data: contact });
  }),
);

/**
 * DELETE /api/v1/customers/:id/contacts/:contactId
 */
router.delete(
  '/:contactId',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id, contactId } = contactParamsSchema.parse(req.params);
    await contactService.removeContact(id, contactId);
    res.json({ success: true, message: 'Contact removed' });
  }),
);

export { router as contactsRouter };
