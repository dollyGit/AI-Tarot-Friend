/**
 * TarotFriend — Shared Logger
 *
 * Pino-based structured logger with PII redaction, environment-aware
 * configuration, and trace ID support.
 *
 * Pattern borrowed from TarotReading/backend/src/lib/logger.ts
 */
import pino from 'pino';

// ─── Types ─────────────────────────────────────────────

export type Logger = pino.Logger;

// ─── PII Redaction Paths ───────────────────────────────

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-service-auth"]',
  'password',
  'email',
  'token',
  'accessToken',
  'refreshToken',
  'credit_card',
  'ssn',
];

// ─── Factory ───────────────────────────────────────────

export function createLogger(options?: {
  service?: string;
  level?: string;
  traceId?: string;
}): Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = options?.level ?? process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info');

  const baseConfig: pino.LoggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    base: {
      service: options?.service ?? process.env.SERVICE_NAME ?? 'unknown',
      ...(options?.traceId ? { traceId: options.traceId } : {}),
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  // Pretty-print in development
  if (isDev) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(baseConfig);
}
