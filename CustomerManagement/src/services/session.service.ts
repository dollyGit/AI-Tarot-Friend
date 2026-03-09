/**
 * Session Service — Redis-backed Session + Presence + DAU (P2.5)
 */
import { v4 as uuidv4 } from 'uuid';
import { cache } from '../lib/cache.js';
import { logger } from '../lib/logger.js';

const SESSION_TTL = 1800;       // 30 minutes sliding window
const PRESENCE_TTL = 300;       // 5 minutes heartbeat
const RATE_LIMIT_WINDOW = 60;   // 1 minute default

const KEYS = {
  session: (id: string) => `session:${id}`,
  customerSessions: (id: string) => `customer:sessions:${id}`,
  presence: (id: string) => `presence:${id}`,
  onlineSet: 'customer:online',
  dailyActive: 'customer:daily_active',
  rateLimit: (customerId: string, action: string) => `ratelimit:${customerId}:${action}`,
  conversationWorking: (id: string) => `conversation:working:${id}`,
};

interface SessionData {
  sessionId: string;
  userId: string;
  deviceInfo?: string;
  createdAt: string;
  lastActiveAt: string;
}

export class SessionService {
  /**
   * Create a new session (login).
   */
  async createSession(userId: string, deviceInfo?: string): Promise<SessionData> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    const sessionData: SessionData = {
      sessionId,
      userId,
      deviceInfo,
      createdAt: now,
      lastActiveAt: now,
    };

    const redis = cache.getClient();

    // Store session with TTL
    await cache.set(KEYS.session(sessionId), sessionData, SESSION_TTL);

    // Track session in customer's session set (multi-device)
    await redis.sadd(KEYS.customerSessions(userId), sessionId);

    // Record DAU (HyperLogLog)
    await redis.pfadd(KEYS.dailyActive, userId);

    // Set presence
    await this.updatePresence(userId);

    logger.info({ userId, sessionId }, 'Session created');

    return sessionData;
  }

  /**
   * Get session data and refresh TTL (sliding window).
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = await cache.get<SessionData>(KEYS.session(sessionId));
    if (!session) return null;

    // Refresh TTL (sliding window)
    session.lastActiveAt = new Date().toISOString();
    await cache.set(KEYS.session(sessionId), session, SESSION_TTL);

    return session;
  }

  /**
   * Destroy a session (logout).
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = await cache.get<SessionData>(KEYS.session(sessionId));
    if (!session) return;

    const redis = cache.getClient();

    await cache.del(KEYS.session(sessionId));
    await redis.srem(KEYS.customerSessions(session.userId), sessionId);

    // Check if user has other active sessions
    const remaining = await redis.scard(KEYS.customerSessions(session.userId));
    if (remaining === 0) {
      await this.clearPresence(session.userId);
    }

    logger.info({ userId: session.userId, sessionId }, 'Session destroyed');
  }

  /**
   * Get all active sessions for a customer.
   */
  async getCustomerSessions(userId: string): Promise<string[]> {
    const redis = cache.getClient();
    return redis.smembers(KEYS.customerSessions(userId));
  }

  // ── Presence ──────────────────────────────────────────────

  /**
   * Update presence heartbeat (call every ~2 min from client).
   */
  async updatePresence(userId: string): Promise<void> {
    const redis = cache.getClient();

    await cache.set(KEYS.presence(userId), { online: true, lastSeen: new Date().toISOString() }, PRESENCE_TTL);

    // Add to online sorted set with current timestamp as score
    await redis.zadd(KEYS.onlineSet, Date.now(), userId);
  }

  /**
   * Check if a customer is online.
   */
  async isOnline(userId: string): Promise<boolean> {
    return cache.exists(KEYS.presence(userId));
  }

  /**
   * Clear presence (explicit logout or heartbeat expired).
   */
  async clearPresence(userId: string): Promise<void> {
    const redis = cache.getClient();
    await cache.del(KEYS.presence(userId));
    await redis.zrem(KEYS.onlineSet, userId);
  }

  /**
   * Get count of currently online users.
   */
  async getOnlineCount(): Promise<number> {
    const redis = cache.getClient();
    // Clean up stale entries (older than PRESENCE_TTL)
    const cutoff = Date.now() - PRESENCE_TTL * 1000;
    await redis.zremrangebyscore(KEYS.onlineSet, 0, cutoff);
    return redis.zcard(KEYS.onlineSet);
  }

  // ── DAU Counter ────────────────────────────────────────────

  /**
   * Get approximate DAU count (HyperLogLog).
   */
  async getDailyActiveCount(): Promise<number> {
    const redis = cache.getClient();
    return redis.pfcount(KEYS.dailyActive);
  }

  // ── Rate Limiting (per customer per action) ────────────────

  /**
   * Check and increment rate limit counter.
   * Returns { allowed, remaining, resetIn }.
   */
  async checkRateLimit(
    customerId: string,
    action: string,
    maxRequests: number,
    windowSeconds = RATE_LIMIT_WINDOW,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = KEYS.rateLimit(customerId, action);
    const current = await cache.incr(key, windowSeconds);
    const remaining = Math.max(0, maxRequests - current);
    const resetIn = await cache.ttl(key);

    return {
      allowed: current <= maxRequests,
      remaining,
      resetIn,
    };
  }

  // ── Conversation Working Context ──────────────────────────

  /**
   * Store short-term conversation context (working memory).
   */
  async setConversationContext(conversationId: string, context: Record<string, unknown>, ttl = 3600): Promise<void> {
    await cache.set(KEYS.conversationWorking(conversationId), context, ttl);
  }

  /**
   * Get conversation working context.
   */
  async getConversationContext(conversationId: string): Promise<Record<string, unknown> | null> {
    return cache.get<Record<string, unknown>>(KEYS.conversationWorking(conversationId));
  }

  /**
   * Clear conversation working context.
   */
  async clearConversationContext(conversationId: string): Promise<void> {
    await cache.del(KEYS.conversationWorking(conversationId));
  }
}

export const sessionService = new SessionService();
