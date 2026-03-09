import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Orchestrator } from '../services/orchestrator';
import { authenticate } from './middleware/auth';
import { asyncHandler, errors } from './middleware/error-handler';
import { z } from 'zod';

const router = Router();
const orchestrator = new Orchestrator();

// Validation schema
const createReadingSchema = z.object({
  session_id: z.string().uuid(),
  spread_type: z.enum(['1-card', '3-card', '7-card', 'celtic-cross']),
  context: z.string().optional(),
  seed: z.string().optional(),
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

/**
 * POST /api/v1/readings
 * Create a new tarot reading
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const validated = createReadingSchema.parse(req.body);
    const { session_id, spread_type, context, seed } = validated;

    // Verify session belongs to user
    const session = await prisma.session.findUnique({
      where: { id: session_id },
    });

    if (!session || session.user_id !== userId) {
      throw errors.forbidden('Session not found or access denied');
    }

    // Check if premium required for 7-card or celtic-cross
    if (spread_type === '7-card' || spread_type === 'celtic-cross') {
      const subscription = await prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: 'active',
          end_at: { gt: new Date() },
        },
      });

      if (!subscription) {
        throw errors.premiumRequired(spread_type);
      }
    }

    // Execute reading
    const result = await orchestrator.executeReading({
      spread_type,
      context,
      seed,
      locale: (await prisma.user.findUnique({ where: { id: userId } }))?.locale || 'en',
    });

    // Save reading to database
    const reading = await prisma.tarotDraw.create({
      data: {
        session_id,
        spread_type,
        cards: result.cards as any,
        interpretation: result.interpretation as any,
        seed: seed || null,
        token_count: null, // TODO: Track from LLM response
      },
    });

    res.status(201).json({
      id: reading.id,
      session_id: reading.session_id,
      spread_type: reading.spread_type,
      cards: result.cards,
      interpretation: result.interpretation,
      created_at: reading.created_at.toISOString(),
    });
  })
);

/**
 * GET /api/v1/readings/:id
 * Get reading by ID
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const readingId = req.params.id;

    const reading = await prisma.tarotDraw.findUnique({
      where: { id: readingId },
      include: { session: true },
    });

    if (!reading) {
      throw errors.notFound('Reading');
    }

    if (reading.session.user_id !== userId) {
      throw errors.forbidden('Access denied');
    }

    res.json({
      id: reading.id,
      session_id: reading.session_id,
      spread_type: reading.spread_type,
      cards: reading.cards,
      interpretation: reading.interpretation,
      created_at: reading.created_at.toISOString(),
    });
  })
);

/**
 * POST /api/v1/readings/:id/feedback
 * Submit feedback for reading
 */
router.post(
  '/:id/feedback',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const readingId = req.params.id;

    const validated = feedbackSchema.parse(req.body);
    const { rating, comment } = validated;

    // Verify reading exists and belongs to user
    const reading = await prisma.tarotDraw.findUnique({
      where: { id: readingId },
      include: { session: true },
    });

    if (!reading) {
      throw errors.notFound('Reading');
    }

    if (reading.session.user_id !== userId) {
      throw errors.forbidden('Access denied');
    }

    // Create feedback
    const feedback = await prisma.readingFeedback.create({
      data: {
        tarot_draw_id: readingId,
        user_id: userId,
        rating,
        comment: comment || null,
      },
    });

    res.status(201).json({
      id: feedback.id,
      rating: feedback.rating,
      created_at: feedback.created_at.toISOString(),
    });
  })
);

export { router as readingsRouter };
