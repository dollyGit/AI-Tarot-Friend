/**
 * Shared package exports
 * Types and utilities used across frontend, mobile, and backend
 */

// Export all API contract types
export * from './types/api-contracts';

// Export API client base
export { BaseApiClient, ApiClientError } from './services/api-client-base';
export type { RequestConfig } from './services/api-client-base';
