/**
 * Birth Chart Routes — Chart Index Management (P2.3)
 */
import { Router } from 'express';
import { z } from 'zod';
import { birthChartService } from '../../services/birth-chart.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { createBirthChartSchema, uuidParamSchema } from '../validators/customer.validator.js';

const router = Router({ mergeParams: true });

/**
 * POST /api/v1/customers/:id/birth-charts
 */
router.post(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const data = createBirthChartSchema.parse(req.body);
    const chart = await birthChartService.create(id, data);
    res.status(201).json({ success: true, data: chart });
  }),
);

/**
 * GET /api/v1/customers/:id/birth-charts
 */
router.get(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const chartType = z.string().optional().parse(req.query.chartType);
    const charts = await birthChartService.list(id, chartType);
    res.json({ success: true, data: charts });
  }),
);

/**
 * GET /api/v1/customers/:id/birth-charts/:chartId
 */
router.get(
  '/:chartId',
  authenticate(),
  asyncHandler(async (req, res) => {
    const params = z.object({
      id: z.string().uuid(),
      chartId: z.string().uuid(),
    }).parse(req.params);
    const chart = await birthChartService.findById(params.id, params.chartId);
    res.json({ success: true, data: chart });
  }),
);

export { router as birthChartsRouter };
