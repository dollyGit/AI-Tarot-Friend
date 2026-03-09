import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Orchestrator } from '../services/orchestrator';
import { authenticate } from './middleware/auth';
import { asyncHandler, errors } from './middleware/error-handler';
import { z } from 'zod';

const router = Router();
const orchestrator = new Orchestrator();

// Validation schema
const createSessionSchema = z.object({
  channel: z.enum(['web', 'mobile', 'line']),
  user_input: z.string().optional(),
});

/**
 * POST /api/v1/sessions
 * Create a new conversation session
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Validate input
    const validated = createSessionSchema.parse(req.body);
    const { channel, user_input } = validated;

    // Analyze sentiment if user input provided
    let sentiment = null;
    let crisis_resources = null;

    if (user_input) {
      const analysis = await orchestrator.analyzeSentiment(user_input);
      sentiment = analysis.sentiment;
      crisis_resources = analysis.crisis_resources;
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        user_id: userId,
        channel,
        sentiment: sentiment as any || undefined,
        topic_tags: [],
      },
    });

    // Update user last login
    await prisma.user.update({
      where: { id: userId },
      data: { last_login_at: new Date() },
    });

    const response: any = {
      id: session.id,
      user_id: session.user_id,
      channel: session.channel,
      created_at: session.created_at.toISOString(),
    };

    if (sentiment) {
      response.sentiment = sentiment;
    }

    if (crisis_resources) {
      response.crisis_resources = crisis_resources;
    }

    res.status(201).json(response);
  })
);

/**
 * GET /api/v1/sessions/recent
 * Get most recent session for user
 */
router.get(
  '/recent',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const session = await prisma.session.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        tarot_draws: {
          take: 1,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!session) {
      throw errors.notFound('Session');
    }

    res.json({
      id: session.id,
      channel: session.channel,
      sentiment: session.sentiment,
      created_at: session.created_at.toISOString(),
      last_reading: session.tarot_draws[0] || null,
    });
  })
);

export { router as sessionsRouter };
