import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializeObservability } from './lib/observability';
import { logger } from './lib/logger';
import { checkDatabaseConnection, disconnectDatabase } from './lib/prisma';
import { cache } from './lib/cache';
import { errorHandler, notFoundHandler } from './api/middleware/error-handler';

// Initialize observability before anything else
initializeObservability();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId: req.user?.userId,
      },
      'Request completed'
    );
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseConnection();
  const cacheHealthy = await cache.healthCheck();

  const isHealthy = dbHealthy && cacheHealthy;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    database: dbHealthy ? 'connected' : 'disconnected',
    redis: cacheHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API routes
import { sessionsRouter } from './api/sessions';
import { readingsRouter } from './api/readings';

app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/readings', readingsRouter);
// Additional routes will be added for users, subscriptions, etc.

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');

  try {
    await disconnectDatabase();
    await cache.close();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Server started');
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection');
  server.close(() => process.exit(1));
});

export { app };
