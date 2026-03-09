/**
 * DAL Client Stub
 *
 * Placeholder for gRPC client to the Data Access Layer.
 * Will be replaced with generated gRPC client code in Phase 1.
 *
 * For now, services use Prisma directly for their own DB.
 * This stub provides the future API shape.
 */
import { logger } from './logger.js';

export interface DalQueryOptions {
  service: string;
  entity: string;
  filters?: Record<string, string>;
  limit?: number;
  offset?: number;
  orderBy?: string;
  cachePolicy?: 'cache_first' | 'db_first' | 'cache_only' | 'no_cache';
}

export interface DalWriteOptions {
  service: string;
  entity: string;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  strategy?: 'write_through' | 'write_behind' | 'write_around';
}

/**
 * DAL Client — stub implementation.
 *
 * In Phase 1, this will be replaced with a real gRPC client
 * generated from proto/dal/v1/dal.proto
 */
export class DalClient {
  private connected = false;

  async connect(): Promise<void> {
    logger.info('[DAL Client] Stub: connect called (no-op until Phase 1)');
    this.connected = true;
  }

  async query(_options: DalQueryOptions): Promise<unknown[]> {
    logger.warn('[DAL Client] Stub: query called — use Prisma directly until Phase 1');
    return [];
  }

  async write(_options: DalWriteOptions): Promise<{ id: string; success: boolean }> {
    logger.warn('[DAL Client] Stub: write called — use Prisma directly until Phase 1');
    return { id: '', success: false };
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }
}

export const dalClient = new DalClient();
