/**
 * Authentication Middleware
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email?: string;
      };
    }
  }
}

interface TokenPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
}

/**
 * Required authentication — returns 401 if token invalid/missing
 */
export function authenticate() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractBearerToken(req.headers.authorization);

      if (!token) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const payload = verifyToken(token);
      if (!payload) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
        });
        return;
      }

      if (payload.type !== 'access') {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN_TYPE', message: 'Access token required' },
        });
        return;
      }

      req.user = { userId: payload.userId, email: payload.email };
      next();
    } catch (error) {
      logger.error({ error }, 'Authentication error');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' },
      });
    }
  };
}

/**
 * Optional authentication — continues even without token
 */
export function optionalAuthenticate() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.type === 'access') {
        req.user = { userId: payload.userId, email: payload.email };
      }
    }
    next();
  };
}

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
