/**
 * TarotFriend — Health Check Utility
 *
 * Provides a consistent /health endpoint response across all services.
 * Each service registers its own checkers (DB, Redis, Kafka, etc.)
 * and this utility aggregates them into a standard response.
 */
import type { HealthResponse, HealthCheckResult } from '../types/api-contracts.js';

// ─── Types ─────────────────────────────────────────────

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthChecker {
  name: string;
  check: () => Promise<HealthCheckResult>;
}

// ─── Factory ───────────────────────────────────────────

export function createHealthCheck(options: {
  service: string;
  version: string;
  startedAt: Date;
}) {
  const checkers: HealthChecker[] = [];

  return {
    /**
     * Register a dependency health checker (e.g., database, cache, queue).
     */
    register(checker: HealthChecker): void {
      checkers.push(checker);
    },

    /**
     * Run all registered checks and return aggregated status.
     * Use as the handler for GET /health endpoint.
     */
    async check(): Promise<HealthResponse> {
      const results: Record<string, HealthCheckResult> = {};
      let overallStatus: HealthStatus = 'ok';

      await Promise.all(
        checkers.map(async (checker) => {
          const start = Date.now();
          try {
            const result = await checker.check();
            results[checker.name] = {
              ...result,
              latency_ms: Date.now() - start,
            };
            if (result.status === 'error') {
              overallStatus = 'degraded';
            }
          } catch (error) {
            results[checker.name] = {
              status: 'error',
              latency_ms: Date.now() - start,
              message: error instanceof Error ? error.message : 'Unknown error',
            };
            overallStatus = 'degraded';
          }
        }),
      );

      // If ALL checks fail, mark as down
      const allFailed = Object.values(results).every((r) => r.status === 'error');
      if (allFailed && checkers.length > 0) {
        overallStatus = 'down';
      }

      const uptimeSeconds = Math.floor((Date.now() - options.startedAt.getTime()) / 1000);

      return {
        status: overallStatus,
        service: options.service,
        version: options.version,
        uptime_seconds: uptimeSeconds,
        checks: results,
      };
    },
  };
}
