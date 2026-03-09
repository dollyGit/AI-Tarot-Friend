/**
 * Finance Routes — Transaction Records (P2.3)
 */
import { Router } from 'express';
import { z } from 'zod';
import { financeService } from '../../services/finance.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { createFinanceRecordSchema, uuidParamSchema } from '../validators/customer.validator.js';

const router = Router({ mergeParams: true });

/**
 * POST /api/v1/customers/:id/finance-records
 */
router.post(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const data = createFinanceRecordSchema.parse(req.body);
    const record = await financeService.create(id, data, req.user?.userId);
    res.status(201).json({ success: true, data: record });
  }),
);

/**
 * GET /api/v1/customers/:id/finance-records
 */
router.get(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const type = z.string().optional().parse(req.query.type);
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.page ?? 1);
    const limit = z.coerce.number().int().min(1).max(100).default(20).parse(req.query.limit ?? 20);
    const result = await financeService.list(id, { type, page, limit });
    res.json({ success: true, ...result });
  }),
);

/**
 * GET /api/v1/customers/:id/finance-summary
 */
router.get(
  '/summary',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const summary = await financeService.getSummary(id);
    res.json({ success: true, data: summary });
  }),
);

export { router as financeRouter };
