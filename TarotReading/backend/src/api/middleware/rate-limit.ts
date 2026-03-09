import { Request, Response, NextFunction } from 'express';
import { cache } from '../../lib/cache';
import { logger } from '../../lib/logger';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Redis key prefix
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyPrefix = 'rate-limit',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Determine identifier (user ID or IP)
      const identifier = req.user?.userId || req.ip || 'anonymous';
      const key = `${keyPrefix}:${identifier}`;

      // Get current count
      const current = await cache.incr(key, windowSeconds);

      // Check if limit exceeded
      if (current > maxRequests) {
        const ttl = await cache.ttl(key);
        const resetTime = new Date(Date.now() + ttl * 1000);

        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            details: {
              limit: maxRequests,
              current,
              resetAt: resetTime.toISOString(),
            },
          },
        });

        logger.warn(
          { identifier, current, limit: maxRequests, key },
          'Rate limit exceeded'
        );
        return;
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + windowSeconds);

      // Handle skip options
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalJson = res.json.bind(res);
        res.json = function (body: any) {
          const statusCode = res.statusCode;
          const isSuccess = statusCode >= 200 && statusCode < 300;
          const isFailed = statusCode >= 400;

          if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && isFailed)) {
            // Decrement counter
            cache.getClient().decr(key).catch((err) => {
              logger.error({ err, key }, 'Failed to decrement rate limit counter');
            });
          }

          return originalJson(body);
        };
      }

      next();
    } catch (err) {
      logger.error({ err }, 'Rate limiting error');
      // Fail open - allow request on rate limiter error
      next();
    }
  };
}

/**
 * Standard rate limiters for different endpoints
 */
export const rateLimiters = {
  // General API: 100 requests per minute
  api: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'rl:api',
  }),

  // Auth endpoints: 10 requests per 15 minutes
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'rl:auth',
  }),

  // Reading creation: handled by quota system, but backup limit
  readings: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'rl:readings',
  }),

  // Admin endpoints: 50 requests per minute
  admin: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 50,
    keyPrefix: 'rl:admin',
  }),
};
