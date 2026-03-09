/**
 * Rate Limiting Middleware — Redis-backed
 */
import { Request, Response, NextFunction } from 'express';
import { cache } from '../../lib/cache.js';
import { logger } from '../../lib/logger.js';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = 'rate-limit' } = options;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.user?.userId ?? req.ip ?? 'anonymous';
      const key = `${keyPrefix}:${identifier}`;
      const current = await cache.incr(key, windowSeconds);

      if (current > maxRequests) {
        const ttl = await cache.ttl(key);
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            details: { limit: maxRequests, resetIn: ttl },
          },
        });
        return;
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + windowSeconds);
      next();
    } catch (err) {
      logger.error({ err }, 'Rate limiting error — failing open');
      next(); // Fail open
    }
  };
}

export const rateLimiters = {
  api: createRateLimiter({ windowMs: 60_000, maxRequests: 100, keyPrefix: 'rl:api' }),
  auth: createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 10, keyPrefix: 'rl:auth' }),
};
