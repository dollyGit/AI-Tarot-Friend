/**
 * Frontend API Client
 * Extends shared BaseApiClient with frontend-specific auth handling
 * and typed methods for all backend endpoints
 */

import {
  BaseApiClient,
  type Session,
  type RecentSession,
  type Reading,
  type ReadingFeedback,
  type CreateSessionRequest,
  type CreateReadingRequest,
  type SubmitFeedbackRequest,
  type User,
  type Subscription,
  type QuotaUsage,
} from '@tarot/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiClient extends BaseApiClient {
  private token: string | null = null;

  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Get auth token from localStorage
   */
  protected async getAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null; // SSR - no token
    }

    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }

    return this.token;
  }

  /**
   * Set auth token (after login)
   */
  public setAuthToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Clear auth token (logout)
   */
  public clearAuthToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // ==========================================
  // Session Endpoints
  // ==========================================

  /**
   * Create new session
   * POST /api/v1/sessions
   */
  public async createSession(data: CreateSessionRequest): Promise<Session> {
    return this.post<Session>('/sessions', data);
  }

  /**
   * Get most recent session
   * GET /api/v1/sessions/recent
   */
  public async getRecentSession(): Promise<RecentSession> {
    return this.get<RecentSession>('/sessions/recent');
  }

  // ==========================================
  // Reading Endpoints
  // ==========================================

  /**
   * Create new tarot reading
   * POST /api/v1/readings
   */
  public async createReading(data: CreateReadingRequest): Promise<Reading> {
    return this.post<Reading>('/readings', data);
  }

  /**
   * Get reading by ID
   * GET /api/v1/readings/:id
   */
  public async getReading(readingId: string): Promise<Reading> {
    return this.get<Reading>(`/readings/${readingId}`);
  }

  /**
   * Submit feedback for reading
   * POST /api/v1/readings/:id/feedback
   */
  public async submitFeedback(
    readingId: string,
    data: SubmitFeedbackRequest
  ): Promise<ReadingFeedback> {
    return this.post<ReadingFeedback>(`/readings/${readingId}/feedback`, data);
  }

  // ==========================================
  // User Endpoints
  // ==========================================

  /**
   * Get current user profile
   * GET /api/v1/users/me
   */
  public async getCurrentUser(): Promise<User> {
    return this.get<User>('/users/me');
  }

  /**
   * Get current subscription status
   * GET /api/v1/users/me/subscription
   */
  public async getSubscription(): Promise<Subscription> {
    return this.get<Subscription>('/users/me/subscription');
  }

  /**
   * Get quota usage
   * GET /api/v1/users/me/quota
   */
  public async getQuota(): Promise<QuotaUsage> {
    return this.get<QuotaUsage>('/users/me/quota');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export { ApiClient };
