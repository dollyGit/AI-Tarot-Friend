/**
 * Compliance Routes — Consent + Notes (P2.3)
 */
import { Router } from 'express';
import { z } from 'zod';
import { complianceService } from '../../services/compliance.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import {
  createConsentSchema,
  createNoteSchema,
  uuidParamSchema,
} from '../validators/customer.validator.js';

const router = Router({ mergeParams: true });

// ── Consent ───────────────────────────────────────────────

/**
 * POST /api/v1/customers/:id/consents
 */
router.post(
  '/consents',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const data = createConsentSchema.parse(req.body);
    const consent = await complianceService.recordConsent(id, data);
    res.status(201).json({ success: true, data: consent });
  }),
);

/**
 * GET /api/v1/customers/:id/consents
 */
router.get(
  '/consents',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const consents = await complianceService.listConsents(id);
    res.json({ success: true, data: consents });
  }),
);

// ── Notes ─────────────────────────────────────────────────

/**
 * POST /api/v1/customers/:id/notes
 */
router.post(
  '/notes',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const data = createNoteSchema.parse(req.body);
    const authorId = req.user!.userId;
    const note = await complianceService.addNote(id, data, authorId);
    res.status(201).json({ success: true, data: note });
  }),
);

/**
 * GET /api/v1/customers/:id/notes
 */
router.get(
  '/notes',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const category = z.string().optional().parse(req.query.category);
    const notes = await complianceService.listNotes(id, category);
    res.json({ success: true, data: notes });
  }),
);

export { router as complianceRouter };
