/**
 * Address Routes — Customer Address CRUD (P2.4)
 */
import { Router } from 'express';
import { z } from 'zod';
import { addressService } from '../../services/address.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import {
  createAddressSchema,
  updateAddressSchema,
  uuidParamSchema,
} from '../validators/customer.validator.js';

const router = Router({ mergeParams: true });

/**
 * POST /api/v1/customers/:id/addresses
 */
router.post(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const data = createAddressSchema.parse(req.body);
    const address = await addressService.create(id, data);
    res.status(201).json({ success: true, data: address });
  }),
);

/**
 * GET /api/v1/customers/:id/addresses
 */
router.get(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const addresses = await addressService.list(id);
    res.json({ success: true, data: addresses });
  }),
);

/**
 * PATCH /api/v1/customers/:id/addresses/:addressId
 */
router.patch(
  '/:addressId',
  authenticate(),
  asyncHandler(async (req, res) => {
    const params = z.object({
      id: z.string().uuid(),
      addressId: z.string().uuid(),
    }).parse(req.params);
    const data = updateAddressSchema.parse(req.body);
    const address = await addressService.update(params.id, params.addressId, data);
    res.json({ success: true, data: address });
  }),
);

/**
 * DELETE /api/v1/customers/:id/addresses/:addressId
 */
router.delete(
  '/:addressId',
  authenticate(),
  asyncHandler(async (req, res) => {
    const params = z.object({
      id: z.string().uuid(),
      addressId: z.string().uuid(),
    }).parse(req.params);
    await addressService.delete(params.id, params.addressId);
    res.json({ success: true, message: 'Address deleted' });
  }),
);

export { router as addressesRouter };
