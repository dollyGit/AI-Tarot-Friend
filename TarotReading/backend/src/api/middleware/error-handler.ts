import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../../lib/logger';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

/**
 * Custom API Error class
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error constructors
 */
export const errors = {
  badRequest: (message: string, details?: any) =>
    new AppError(message, 400, 'BAD_REQUEST', details),

  unauthorized: (message: string = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message: string = 'Access denied') =>
    new AppError(message, 403, 'FORBIDDEN'),

  notFound: (resource: string) =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),

  conflict: (message: string, details?: any) =>
    new AppError(message, 409, 'CONFLICT', details),

  quotaExceeded: (message: string = 'Daily quota exceeded') =>
    new AppError(message, 429, 'QUOTA_EXCEEDED'),

  premiumRequired: (feature: string) =>
    new AppError(
      `${feature} is available for Premium subscribers only`,
      403,
      'PREMIUM_REQUIRED',
      { feature }
    ),

  internal: (message: string = 'Internal server error') =>
    new AppError(message, 500, 'INTERNAL_ERROR'),
};

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Don't process if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });

    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Application error');
    } else {
      logger.warn({ err: err.message, path: req.path, method: req.method }, 'Client error');
    }

    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        res.status(409).json({
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'A record with this value already exists',
            details: { field: err.meta?.target },
          },
        });
        return;

      case 'P2025': // Record not found
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Record not found',
          },
        });
        return;

      case 'P2003': // Foreign key constraint violation
        res.status(400).json({
          error: {
            code: 'INVALID_REFERENCE',
            message: 'Referenced record does not exist',
          },
        });
        return;

      default:
        logger.error({ err, code: err.code }, 'Prisma error');
        res.status(500).json({
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
          },
        });
        return;
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Handle generic errors
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
    },
    'Unhandled error'
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
