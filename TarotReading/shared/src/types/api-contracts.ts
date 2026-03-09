/**
 * Shared TypeScript types for API contracts
 * These types match the OpenAPI spec and backend implementation
 */

export type SpreadType = '1-card' | '3-card' | '7-card' | 'celtic-cross';
export type Orientation = 'upright' | 'reversed';
export type Channel = 'web' | 'mobile' | 'line';
export type SentimentLabel = 'negative' | 'neutral' | 'positive';
export type CrisisLevel = 'none' | 'moderate' | 'high' | 'immediate';

// Sentiment
export interface Sentiment {
  score: number; // -1 to 1
  label: SentimentLabel;
  confidence: number;
  crisis_level: CrisisLevel;
}

// Crisis Resources
export interface CrisisHotline {
  name: string;
  phone: string;
  locale: string;
  available_hours?: string;
}

export interface CrisisResources {
  hotlines: CrisisHotline[];
  website_url: string;
}

// Card
export interface DrawnCard {
  card_id: number;
  name: string;
  position: number;
  orientation: Orientation;
  meaning: string;
}

// Interpretation
export interface Interpretation {
  tldr: string;
  key_points: string[]; // 3-5 points
  advice: {
    short_term: string;
    medium_term: string;
    long_term: string;
  };
  warnings: string;
}

// Session
export interface Session {
  id: string;
  user_id: string;
  channel: Channel;
  sentiment?: Sentiment;
  created_at: string;
  crisis_resources?: CrisisResources;
}

export interface RecentSession extends Session {
  last_reading?: Reading | null;
}

// Reading
export interface Reading {
  id: string;
  session_id: string;
  spread_type: SpreadType;
  cards: DrawnCard[];
  interpretation: Interpretation;
  created_at: string;
  token_count?: number;
}

// User
export interface User {
  id: string;
  email?: string;
  display_name?: string;
  locale: string;
  created_at: string;
}

// Subscription
export interface Subscription {
  id: string;
  plan_id: string;
  platform: string;
  status: string;
  start_at: string;
  end_at: string;
  auto_renew: boolean;
}

// Quota
export interface QuotaLimits {
  single_card_daily: number;
  three_card_daily: number;
  seven_card_daily: number;
}

export interface QuotaUsage {
  plan: string;
  limits: QuotaLimits;
  used_today: Record<string, number>;
  resets_at: string;
}

// Feedback
export interface ReadingFeedback {
  id: string;
  rating: number; // 1-5
  comment?: string;
  created_at: string;
}

// API Error
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Request types
export interface CreateSessionRequest {
  channel: Channel;
  user_input?: string;
}

export interface CreateReadingRequest {
  session_id: string;
  spread_type: SpreadType;
  context?: string;
  seed?: string;
}

export interface SubmitFeedbackRequest {
  rating: number; // 1-5
  comment?: string;
}

// Pagination
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
