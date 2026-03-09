/**
 * Kafka Event Producer
 *
 * Publishes domain events to Kafka topics.
 * Events follow the pattern: customer.{entity}.{action}
 */
import { Kafka, Producer, CompressionTypes } from 'kafkajs';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const TOPIC = 'customer-events';

interface DomainEvent {
  type: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata?: {
    userId?: string;
    correlationId?: string;
    timestamp?: string;
  };
}

class EventProducer {
  private static instance: EventProducer;
  private producer: Producer;
  private connected = false;

  private constructor() {
    const kafka = new Kafka({
      clientId: config.SERVICE_NAME,
      brokers: config.KAFKA_BROKERS.split(','),
      retry: { retries: 3 },
    });
    this.producer = kafka.producer();
  }

  static getInstance(): EventProducer {
    if (!EventProducer.instance) {
      EventProducer.instance = new EventProducer();
    }
    return EventProducer.instance;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    try {
      await this.producer.connect();
      this.connected = true;
      logger.info('Kafka producer connected');
    } catch (err) {
      logger.error({ err }, 'Kafka producer connection failed — events will be dropped');
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.producer.disconnect();
      this.connected = false;
      logger.info('Kafka producer disconnected');
    } catch (err) {
      logger.error({ err }, 'Kafka producer disconnect error');
    }
  }

  /**
   * Publish a domain event. Fails silently if Kafka is unavailable
   * (fire-and-forget pattern for non-critical event sourcing).
   */
  async publish(event: DomainEvent): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
    if (!this.connected) {
      logger.warn({ event: event.type }, 'Kafka not connected — event dropped');
      return;
    }

    try {
      await this.producer.send({
        topic: TOPIC,
        compression: CompressionTypes.GZIP,
        messages: [
          {
            key: event.aggregateId,
            value: JSON.stringify({
              ...event,
              metadata: {
                ...event.metadata,
                timestamp: event.metadata?.timestamp ?? new Date().toISOString(),
                source: config.SERVICE_NAME,
              },
            }),
            headers: {
              'event-type': event.type,
              'aggregate-id': event.aggregateId,
            },
          },
        ],
      });

      logger.debug({ type: event.type, aggregateId: event.aggregateId }, 'Event published');
    } catch (err) {
      logger.error({ err, event: event.type }, 'Failed to publish event');
    }
  }
}

export const eventProducer = EventProducer.getInstance();

// ── Typed Event Helpers ───────────────────────────────────

export const CustomerEvents = {
  created: (customerId: string, data: Record<string, unknown>, userId?: string) =>
    eventProducer.publish({
      type: 'customer.created',
      aggregateId: customerId,
      payload: data,
      metadata: { userId },
    }),

  updated: (customerId: string, changes: Record<string, unknown>, userId?: string) =>
    eventProducer.publish({
      type: 'customer.updated',
      aggregateId: customerId,
      payload: changes,
      metadata: { userId },
    }),

  deleted: (customerId: string, userId?: string) =>
    eventProducer.publish({
      type: 'customer.deleted',
      aggregateId: customerId,
      payload: { deletedAt: new Date().toISOString() },
      metadata: { userId },
    }),

  contactAdded: (customerId: string, contactData: Record<string, unknown>, userId?: string) =>
    eventProducer.publish({
      type: 'customer.contact.added',
      aggregateId: customerId,
      payload: contactData,
      metadata: { userId },
    }),

  contactUpdated: (customerId: string, contactData: Record<string, unknown>, userId?: string) =>
    eventProducer.publish({
      type: 'customer.contact.updated',
      aggregateId: customerId,
      payload: contactData,
      metadata: { userId },
    }),

  financeRecorded: (customerId: string, record: Record<string, unknown>, userId?: string) =>
    eventProducer.publish({
      type: 'customer.finance.recorded',
      aggregateId: customerId,
      payload: record,
      metadata: { userId },
    }),
};
