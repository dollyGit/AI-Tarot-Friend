import { Request, Response, NextFunction } from 'express';
import { extractBearerToken, verifyToken, TokenPayload } from '../../lib/auth';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

// Extend Express Request type to include user
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

/**
 * Middleware to authenticate requests using JWT
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Verify token
    const payload: TokenPayload = verifyToken(token);

    if (payload.type !== 'access') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Access token required',
        },
      });
      return;
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({
        error: {
          code: 'USER_SUSPENDED',
          message: 'User account is not active',
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email || undefined,
    };

    next();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Token expired') {
        res.status(401).json({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired',
          },
        });
        return;
      }

      if (err.message === 'Invalid token') {
        res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token is invalid',
          },
        });
        return;
      }
    }

    logger.error({ err }, 'Authentication middleware error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Optional authentication - attaches user if token present, but doesn't fail if not
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      next();
      return;
    }

    const payload: TokenPayload = verifyToken(token);

    if (payload.type === 'access') {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });

      if (user && user.status === 'active') {
        req.user = {
          userId: user.id,
          email: user.email || undefined,
        };
      }
    }

    next();
  } catch (err) {
    // Silently fail for optional auth
    logger.debug({ err }, 'Optional authentication failed');
    next();
  }
}
