// ─── Types ──────────────────────────────────────────────
export * from './types/customer.js';
export * from './types/events.js';
export * from './types/api-contracts.js';

// ─── Services ───────────────────────────────────────────
export { EventBus, type EventBusConfig, type EventHandler } from './services/event-bus.js';
export { ServiceAuth, type ServiceAuthConfig, type ServiceToken } from './services/service-auth.js';

// ─── Utilities ──────────────────────────────────────────
export { createLogger, type Logger } from './utils/logger.js';
export { createHealthCheck, type HealthStatus, type HealthChecker } from './utils/health-check.js';
