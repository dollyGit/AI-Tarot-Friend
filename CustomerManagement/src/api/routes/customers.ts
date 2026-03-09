/**
 * Customer Routes — CRUD (P2.1)
 */
import { Router } from 'express';
import { customerService } from '../../services/customer.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
  uuidParamSchema,
} from '../validators/customer.validator.js';

const router = Router();

/**
 * POST /api/v1/customers
 * Create a new customer with auto-calculated metaphysical fields.
 */
router.post(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const data = createCustomerSchema.parse(req.body);
    const customer = await customerService.create(data, req.user?.userId);
    res.status(201).json({ success: true, data: customer });
  }),
);

/**
 * GET /api/v1/customers
 * List customers with pagination and filters.
 */
router.get(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const query = customerListQuerySchema.parse(req.query);
    const result = await customerService.list(query);
    res.json({ success: true, ...result });
  }),
);

/**
 * GET /api/v1/customers/:id
 * Get a customer by ID with relations.
 */
router.get(
  '/:id',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const customer = await customerService.findById(id);
    res.json({ success: true, data: customer });
  }),
);

/**
 * PATCH /api/v1/customers/:id
 * Update a customer. Re-calculates metaphysical if birthDate changes.
 */
router.patch(
  '/:id',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const data = updateCustomerSchema.parse(req.body);
    const customer = await customerService.update(id, data, req.user?.userId);
    res.json({ success: true, data: customer });
  }),
);

/**
 * DELETE /api/v1/customers/:id
 * Soft-delete a customer (status → 'deleted').
 */
router.delete(
  '/:id',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    await customerService.softDelete(id, req.user?.userId);
    res.json({ success: true, message: 'Customer deleted' });
  }),
);

export { router as customersRouter };
