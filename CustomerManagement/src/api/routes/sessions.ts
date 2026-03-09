/**
 * Session Routes — Session + Presence Management (P2.5)
 */
import { Router } from 'express';
import { z } from 'zod';
import { sessionService } from '../../services/session.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { uuidParamSchema } from '../validators/customer.validator.js';

const router = Router();

/**
 * POST /api/v1/auth/sessions
 * Create a new session (login).
 */
router.post(
  '/',
  authenticate(),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const deviceInfo = z.string().optional().parse(req.body.deviceInfo);
    const session = await sessionService.createSession(userId, deviceInfo);
    res.status(201).json({ success: true, data: session });
  }),
);

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * Destroy a session (logout).
 */
router.delete(
  '/:sessionId',
  authenticate(),
  asyncHandler(async (req, res) => {
    const sessionId = z.string().uuid().parse(req.params.sessionId);
    await sessionService.destroySession(sessionId);
    res.json({ success: true, message: 'Session destroyed' });
  }),
);

/**
 * GET /api/v1/auth/sessions/me
 * List all active sessions for the current user.
 */
router.get(
  '/me',
  authenticate(),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const sessions = await sessionService.getCustomerSessions(userId);
    res.json({ success: true, data: { sessions } });
  }),
);

/**
 * POST /api/v1/auth/sessions/heartbeat
 * Refresh presence heartbeat.
 */
router.post(
  '/heartbeat',
  authenticate(),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    await sessionService.updatePresence(userId);
    res.json({ success: true });
  }),
);

/**
 * GET /api/v1/customers/:id/presence
 * Check if a customer is online.
 */
router.get(
  '/presence/:id',
  optionalAuthenticate(),
  asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const online = await sessionService.isOnline(id);
    res.json({ success: true, data: { online } });
  }),
);

/**
 * GET /api/v1/auth/sessions/stats
 * Get online user count and DAU.
 */
router.get(
  '/stats',
  authenticate(),
  asyncHandler(async (req, res) => {
    const [onlineCount, dau] = await Promise.all([
      sessionService.getOnlineCount(),
      sessionService.getDailyActiveCount(),
    ]);
    res.json({ success: true, data: { onlineCount, dailyActiveUsers: dau } });
  }),
);

export { router as sessionsRouter };
