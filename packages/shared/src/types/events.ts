/**
 * TarotFriend — Cross-service Event Types
 *
 * Kafka event envelope and type definitions shared across all services.
 * Source of truth: ARCHITECTURE.md §3.3
 */

// ─── Event Envelope ────────────────────────────────────

export interface PlatformEvent<T = Record<string, unknown>> {
  event_id: string;
  event_type: EventType;
  source: EventSource;
  timestamp: string;                 // ISO 8601
  version: string;                   // "1.0"
  data: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlation_id: string;
  trace_id?: string;
  customer_id?: string;
  actor_id?: string;
}

// ─── Event Sources ─────────────────────────────────────

export type EventSource =
  | 'tarot-reading'
  | 'customer-mgmt'
  | 'caring'
  | 'shop'
  | 'scheduler'
  | 'dal';

// ─── Event Types ───────────────────────────────────────

export type EventType =
  // TarotReading
  | 'reading.completed'
  | 'reading.feedback'
  | 'crisis.detected'
  // Customer
  | 'customer.created'
  | 'customer.updated'
  | 'customer.tier_changed'
  // Shopping / Shopify
  | 'order.created'
  | 'order.paid'
  | 'order.fulfilled'
  | 'order.cancelled'
  | 'refund.created'
  | 'checkout.started'
  | 'product.updated'
  // Caring
  | 'caring.action_sent'
  | 'caring.action_delivered'
  | 'caring.action_read'
  | 'sentiment.recorded'
  // Scheduler
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.completed'
  | 'appointment.cancelled'
  | 'review.submitted';

// ─── Kafka Topics ──────────────────────────────────────

export const KAFKA_TOPICS = {
  TAROT_READINGS: 'tarot.readings',
  TAROT_CRISIS: 'tarot.crisis',
  CUSTOMER_LIFECYCLE: 'customer.lifecycle',
  SHOP_ORDERS: 'shop.orders',
  SHOP_PRODUCTS: 'shop.products',
  CARING_ACTIONS: 'caring.actions',
  SCHEDULER_APPOINTMENTS: 'scheduler.appointments',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

// ─── Topic → Event Type Mapping ────────────────────────

export const TOPIC_EVENT_MAP: Record<KafkaTopic, EventType[]> = {
  [KAFKA_TOPICS.TAROT_READINGS]: ['reading.completed', 'reading.feedback'],
  [KAFKA_TOPICS.TAROT_CRISIS]: ['crisis.detected'],
  [KAFKA_TOPICS.CUSTOMER_LIFECYCLE]: ['customer.created', 'customer.updated', 'customer.tier_changed'],
  [KAFKA_TOPICS.SHOP_ORDERS]: ['order.created', 'order.paid', 'order.fulfilled', 'order.cancelled', 'refund.created', 'checkout.started'],
  [KAFKA_TOPICS.SHOP_PRODUCTS]: ['product.updated'],
  [KAFKA_TOPICS.CARING_ACTIONS]: ['caring.action_sent', 'caring.action_delivered', 'caring.action_read', 'sentiment.recorded'],
  [KAFKA_TOPICS.SCHEDULER_APPOINTMENTS]: ['appointment.created', 'appointment.confirmed', 'appointment.completed', 'appointment.cancelled', 'review.submitted'],
};

// ─── Event Data Payloads ───────────────────────────────

export interface ReadingCompletedData {
  customer_id: string;
  reading_id: string;
  session_id: string;
  spread_type: string;
  sentiment_score: number;
  sentiment_label: string;
  crisis_level: string;
}

export interface CrisisDetectedData {
  customer_id: string;
  reading_id: string;
  session_id: string;
  crisis_level: 'moderate' | 'high' | 'immediate';
  sentiment_score: number;
  flagged_content?: string;
}

export interface OrderCreatedData {
  customer_id: string;
  shopify_order_id: string;
  total_amount: string;
  currency: string;
  line_items: Array<{
    product_id: string;
    title: string;
    quantity: number;
    price: string;
  }>;
}

export interface AppointmentCreatedData {
  customer_id: string;
  tarotist_id: string;
  appointment_id: string;
  start_at: string;
  end_at: string;
  type: 'online' | 'in_person';
  topic?: string;
}

export interface SentimentRecordedData {
  customer_id: string;
  source: string;
  score: number;
  label: string;
  source_ref_id?: string;
}
