/**
 * Internal Routes — Service-to-Service API
 *
 * These endpoints are consumed by TarotReading, ShoppingCart, Scheduler, etc.
 * Protected by service-auth (shared secret), not JWT.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { customerService } from '../../services/customer.service.js';
import { asyncHandler, errors } from '../middleware/error-handler.js';
import { config } from '../../config/index.js';
import { uuidParamSchema } from '../validators/customer.validator.js';

const router = Router();

/**
 * Service authentication middleware — validates shared secret.
 */
function serviceAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers['x-service-auth'] as string | undefined;
    if (!token || token !== config.SERVICE_AUTH_SECRET) {
      const err = errors.unauthorized('Invalid service auth token');
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
      return;
    }
    next();
  };
}

/**
 * GET /internal/v1/customers/:id/profile
 * Slim customer profile for internal service calls.
 */
router.get(
  '/customers/:id/profile',
  serviceAuth(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const profile = await customerService.getProfile(id);
    res.json({ success: true, data: profile });
  }),
);

export { router as internalRouter };
