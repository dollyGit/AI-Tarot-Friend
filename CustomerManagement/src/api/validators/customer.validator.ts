/**
 * Request Validation Schemas — Zod
 */
import { z } from 'zod';

// ── Customer ──────────────────────────────────────────────

export const createCustomerSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  phone: z.string().max(20).optional(),
  locale: z.string().default('zh-TW'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be YYYY-MM-DD format')
    .optional(),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Birth time must be HH:MM format')
    .optional(),
  birthCity: z.string().max(100).optional(),
  birthLat: z.number().min(-90).max(90).optional(),
  birthLng: z.number().min(-180).max(180).optional(),
  occupation: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
});

export const updateCustomerSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  locale: z.string().optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Birth time must be HH:MM format')
    .optional()
    .nullable(),
  birthCity: z.string().max(100).optional().nullable(),
  birthLat: z.number().min(-90).max(90).optional().nullable(),
  birthLng: z.number().min(-180).max(180).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  tier: z.enum(['free', 'premium', 'vip']).optional(),
});

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  tier: z.enum(['free', 'premium', 'vip']).optional(),
  email: z.string().optional(),
  search: z.string().optional(),
  tag: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'displayName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── Contact ───────────────────────────────────────────────

export const createContactSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(100),
  relationship: z.enum(['spouse', 'child', 'parent', 'friend', 'partner']),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  birthCity: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const updateContactSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  relationship: z.enum(['spouse', 'child', 'parent', 'friend', 'partner']).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  birthCity: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// ── Birth Chart ───────────────────────────────────────────

export const createBirthChartSchema = z.object({
  ownerType: z.enum(['self', 'contact']),
  contactId: z.string().uuid().optional(),
  chartType: z.enum(['natal', 'synastry', 'transit']),
  partnerId: z.string().uuid().optional(),
  documentRef: z.string().optional(),
});

// ── Finance Record ────────────────────────────────────────

export const createFinanceRecordSchema = z.object({
  type: z.enum(['purchase', 'refund', 'top_up', 'subscription']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal'),
  currency: z.enum(['TWD', 'USD']).default('TWD'),
  referenceId: z.string().optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['pending', 'completed', 'failed', 'reversed']).default('pending'),
});

// ── Consent ───────────────────────────────────────────────

export const createConsentSchema = z.object({
  consentType: z.string().min(1, 'Consent type is required'),
  granted: z.boolean(),
  ipAddress: z.string().ip().optional(),
});

// ── Note ──────────────────────────────────────────────────

export const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000),
  category: z.enum(['general', 'support', 'reading', 'care']).default('general'),
});

// ── Tag ───────────────────────────────────────────────────

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  category: z.enum(['interest', 'behavior', 'demographic', 'custom']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const assignTagSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
});

// ── Address ───────────────────────────────────────────────

export const createAddressSchema = z.object({
  label: z.enum(['home', 'office', 'other']).default('home'),
  recipient: z.string().min(1, 'Recipient is required').max(100),
  phone: z.string().max(20).optional(),
  addressLine1: z.string().min(1, 'Address line 1 is required').max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  district: z.string().max(100).optional(),
  postalCode: z.string().min(1, 'Postal code is required').max(10),
  country: z.string().default('TW'),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = z.object({
  label: z.enum(['home', 'office', 'other']).optional(),
  recipient: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  addressLine1: z.string().min(1).max(200).optional(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100).optional(),
  district: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(1).max(10).optional(),
  country: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// ── Session ───────────────────────────────────────────────

export const createSessionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  deviceInfo: z.string().max(500).optional(),
});

// ── Shared Params ─────────────────────────────────────────

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateBirthChartInput = z.infer<typeof createBirthChartSchema>;
export type CreateFinanceRecordInput = z.infer<typeof createFinanceRecordSchema>;
export type CreateConsentInput = z.infer<typeof createConsentSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
