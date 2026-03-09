/**
 * TarotFriend — Cross-service API Contracts
 *
 * Shared request/response types for REST APIs between services.
 * Each service extends these base types for its own endpoints.
 */
import { z } from 'zod';

// ─── Pagination ────────────────────────────────────────

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

// ─── API Response Envelope ─────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMetadata {
  request_id: string;
  duration_ms: number;
  timestamp: string;
}

// ─── Service Health ────────────────────────────────────

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  uptime_seconds: number;
  checks: Record<string, HealthCheckResult>;
}

export interface HealthCheckResult {
  status: 'ok' | 'error';
  latency_ms?: number;
  message?: string;
}

// ─── Common Query Parameters ───────────────────────────

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

// ─── Service Identifiers ───────────────────────────────

export const SERVICES = {
  TAROT_READING: 'tarot-reading',
  CUSTOMER_MGMT: 'customer-mgmt',
  CARING_SERVICE: 'caring',
  SHOPPING_CART: 'shop',
  TAROTIST_SCHEDULER: 'scheduler',
  DATA_ACCESS_LAYER: 'dal',
} as const;

export type ServiceName = (typeof SERVICES)[keyof typeof SERVICES];

export const SERVICE_PORTS: Record<ServiceName, number> = {
  'tarot-reading': 3000,
  'customer-mgmt': 3010,
  'caring': 3020,
  'shop': 3030,
  'scheduler': 3040,
  'dal': 4000,
};

// ─── Channels ──────────────────────────────────────────

export type Channel = 'web' | 'mobile' | 'line' | 'email' | 'sms';

// ─── Sentiment ─────────────────────────────────────────

export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'crisis';

export interface Sentiment {
  score: number;                     // -1.0 to 1.0
  label: SentimentLabel;
  confidence: number;                // 0.0 to 1.0
  crisis_level: CrisisLevel;
}

export type CrisisLevel = 'none' | 'moderate' | 'high' | 'immediate';
