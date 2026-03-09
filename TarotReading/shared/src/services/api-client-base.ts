/**
 * Shared API Client Base
 * Provides common fetch logic, retry mechanism, error handling,
 * and typed request/response wrappers for web and mobile clients
 */

import type { ApiError } from '../types/api-contracts';

export interface RequestConfig extends RequestInit {
  retry?: number;
  retryDelay?: number;
  timeout?: number;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export abstract class BaseApiClient {
  protected baseURL: string;
  protected defaultHeaders: HeadersInit;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get authorization token (implemented by subclasses)
   */
  protected abstract getAuthToken(): Promise<string | null>;

  /**
   * Make HTTP request with retry logic
   */
  protected async request<T>(
    path: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      retry = 3,
      retryDelay = 1000,
      timeout = 10000,
      headers,
      ...fetchConfig
    } = config;

    const url = `${this.baseURL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retry; attempt++) {
      try {
        // Get auth token
        const token = await this.getAuthToken();

        // Build headers
        const requestHeaders: Record<string, string> = {
          ...(this.defaultHeaders as Record<string, string>),
          ...(headers as Record<string, string>),
        };

        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Make request
        const response = await fetch(url, {
          ...fetchConfig,
          headers: requestHeaders,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-2xx responses
        if (!response.ok) {
          const errorData: ApiError = await response.json().catch(() => ({
            error: {
              code: 'UNKNOWN_ERROR',
              message: response.statusText,
            },
          }));

          throw new ApiClientError(
            errorData.error.message,
            response.status,
            errorData.error.code,
            errorData.error.details
          );
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        // Parse JSON response
        const data: T = await response.json();
        return data;
      } catch (err) {
        lastError = err as Error;

        // Don't retry on client errors (4xx) except 429 Rate Limit
        if (
          err instanceof ApiClientError &&
          err.statusCode >= 400 &&
          err.statusCode < 500 &&
          err.statusCode !== 429
        ) {
          throw err;
        }

        // Don't retry on abort (timeout)
        if (err instanceof Error && err.name === 'AbortError') {
          throw new ApiClientError(
            'Request timeout',
            408,
            'TIMEOUT',
            { timeout }
          );
        }

        // Retry with exponential backoff
        if (attempt < retry - 1) {
          const delay = retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Request failed after retries');
  }

  /**
   * GET request
   */
  protected async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  protected async post<T>(
    path: string,
    body?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  protected async put<T>(
    path: string,
    body?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  protected async patch<T>(
    path: string,
    body?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  protected async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'DELETE',
    });
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
