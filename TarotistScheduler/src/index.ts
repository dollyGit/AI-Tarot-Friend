/**
 * Tarotist Scheduler Service — Express Server Entry Point
 *
 * TarotFriend Platform · Port 3040
 */
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { checkDatabaseConnection, disconnectDatabase } from './lib/prisma.js';
import { cache } from './lib/cache.js';
import { errorHandler, notFoundHandler } from './api/middleware/error-handler.js';
import { createHealthCheck } from '@tarotfriend/shared';

const app = express();
const startedAt = new Date();

// ── Health Check Setup ───────────────────────────────────
const health = createHealthCheck({
  service: config.SERVICE_NAME,
  version: '1.0.0',
  startedAt,
});

health.register({
  name: 'database',
  check: async () => {
    const ok = await checkDatabaseConnection();
    return { status: ok ? 'ok' : 'error', message: ok ? 'Connected' : 'Connection failed' };
  },
});

health.register({
  name: 'redis',
  check: async () => {
    const ok = await cache.healthCheck();
    return { status: ok ? 'ok' : 'error', message: ok ? 'Connected' : 'Connection failed' };
  },
});

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      userId: req.user?.userId,
    }, 'Request completed');
  });
  next();
});

// ── Health Endpoint ──────────────────────────────────────
app.get('/health', async (_req, res) => {
  const result = await health.check();
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});

// Prometheus-compatible metrics endpoint (placeholder)
app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# TODO: Implement Prometheus metrics\n');
});

// ── API Routes ───────────────────────────────────────────
// import { someRouter } from './api/some-resource.js';
// app.use('/api/v1/some-resource', someRouter);

// ── Error Handlers ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Graceful Shutdown ────────────────────────────────────
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

// ── Start Server ─────────────────────────────────────────
const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, `${config.SERVICE_NAME} started`);
});

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection');
  server.close(() => process.exit(1));
});

export { app };
