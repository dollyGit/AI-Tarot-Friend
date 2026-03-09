/**
 * TarotFriend — Cross-service Customer Types
 *
 * Shared type definitions for customer data used across all services.
 * Source of truth: CustomerManagement/CUSTOMER_SCHEMA.md + ARCHITECTURE.md §2.2
 */

// ─── Customer Core ─────────────────────────────────────

export interface Customer {
  id: string;
  email: string;
  display_name: string;
  phone?: string;
  locale: CustomerLocale;
  tier: CustomerTier;
  status: CustomerStatus;
  birth_data?: BirthData;
  created_at: string;
  updated_at: string;
}

export type CustomerLocale = 'zh-TW' | 'en';
export type CustomerTier = 'free' | 'premium' | 'vip';
export type CustomerStatus = 'active' | 'suspended' | 'deleted';

// ─── Birth Data (命理資料) ─────────────────────────────

export interface BirthData {
  birth_date: string;               // "1995-06-15"
  birth_time?: string;              // "14:30" or undefined if unknown
  birth_city?: string;
  birth_lat?: number;
  birth_lng?: number;
  zodiac_sign?: ZodiacSign;
  chinese_zodiac?: ChineseZodiac;
  five_element?: FiveElement;
  occupation?: string;
  industry?: string;
}

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export type ChineseZodiac =
  | 'rat' | 'ox' | 'tiger' | 'rabbit'
  | 'dragon' | 'snake' | 'horse' | 'goat'
  | 'monkey' | 'rooster' | 'dog' | 'pig';

export type FiveElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

// ─── Customer Contact (人際圈) ─────────────────────────

export interface CustomerContact {
  id: string;
  customer_id: string;
  nickname: string;
  relationship: ContactRelationship;
  birth_data?: BirthData;
  notes?: string;
  created_at: string;
}

export type ContactRelationship =
  | 'spouse' | 'child' | 'parent' | 'friend'
  | 'partner' | 'sibling' | 'colleague' | 'other';

// ─── Finance Record ────────────────────────────────────

export interface FinanceRecord {
  id: string;
  customer_id: string;
  type: FinanceType;
  amount: string;                   // Decimal as string for precision
  currency: string;                 // "TWD" | "USD"
  reference_id?: string;
  description?: string;
  status: FinanceStatus;
  created_at: string;
}

export type FinanceType = 'purchase' | 'refund' | 'top_up' | 'subscription';
export type FinanceStatus = 'pending' | 'completed' | 'failed' | 'reversed';

// ─── Tags ──────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  color?: string;
}

export type TagCategory = 'interest' | 'behavior' | 'demographic' | 'custom';

// ─── Customer Note ─────────────────────────────────────

export interface CustomerNote {
  id: string;
  customer_id: string;
  author_id: string;
  content: string;
  category: NoteCategory;
  created_at: string;
}

export type NoteCategory = 'general' | 'support' | 'reading' | 'care';

// ─── Consent ───────────────────────────────────────────

export interface CustomerConsent {
  id: string;
  customer_id: string;
  consent_type: ConsentType;
  granted: boolean;
  granted_at?: string;
  revoked_at?: string;
  ip_address?: string;
}

export type ConsentType =
  | 'marketing_email' | 'marketing_sms' | 'marketing_line'
  | 'data_processing' | 'third_party_sharing' | 'analytics';
