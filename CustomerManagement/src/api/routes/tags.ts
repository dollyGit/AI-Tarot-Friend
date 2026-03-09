/**
 * Tag Routes — M:N Tag Management (P2.4)
 */
import { Router } from 'express';
import { z } from 'zod';
import { tagService } from '../../services/tag.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import {
  createTagSchema,
  assignTagSchema,
  uuidParamSchema,
} from '../validators/customer.validator.js';

const router = Router();

// ── Global Tag CRUD ───────────────────────────────────────

/**
 * POST /api/v1/tags
 * Create a new global tag definition.
 */
router.post(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const data = createTagSchema.parse(req.body);
    const tag = await tagService.createTag(data);
    res.status(201).json({ success: true, data: tag });
  }),
);

/**
 * GET /api/v1/tags
 * List all tags (optionally filtered by category).
 */
router.get(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const category = z.string().optional().parse(req.query.category);
    const tags = await tagService.listTags(category);
    res.json({ success: true, data: tags });
  }),
);

export { router as tagsRouter };

// ── Customer Tag Assignment Routes ────────────────────────
// These are nested under /api/v1/customers/:id/tags

const customerTagRouter = Router({ mergeParams: true });

/**
 * GET /api/v1/customers/:id/tags
 */
customerTagRouter.get(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const tags = await tagService.getCustomerTags(id);
    res.json({ success: true, data: tags });
  }),
);

/**
 * POST /api/v1/customers/:id/tags
 */
customerTagRouter.post(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const { tagId } = assignTagSchema.parse(req.body);
    const assignment = await tagService.assignTag(id, tagId);
    res.status(201).json({ success: true, data: assignment });
  }),
);

/**
 * DELETE /api/v1/customers/:id/tags/:tagId
 */
customerTagRouter.delete(
  '/:tagId',
  authenticate(),
  asyncHandler(async (req, res) => {
    const params = z.object({
      id: z.string().uuid(),
      tagId: z.string().uuid(),
    }).parse(req.params);
    await tagService.removeTag(params.id, params.tagId);
    res.json({ success: true, message: 'Tag removed' });
  }),
);

export { customerTagRouter };
