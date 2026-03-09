/**
 * TarotFriend — Kafka Event Bus
 *
 * Lightweight wrapper around KafkaJS for publishing and consuming
 * platform events with typed payloads and tracing support.
 */
import { Kafka, Producer, Consumer, type KafkaConfig, type ConsumerConfig } from 'kafkajs';
import { randomUUID } from 'node:crypto';
import type { PlatformEvent, EventType, EventSource, KafkaTopic, EventMetadata } from '../types/events.js';

// ─── Types ─────────────────────────────────────────────

export interface EventBusConfig {
  brokers: string[];
  clientId: string;
  groupId?: string;
  kafkaConfig?: Partial<KafkaConfig>;
}

export type EventHandler<T = Record<string, unknown>> = (
  event: PlatformEvent<T>,
  topic: string,
) => Promise<void>;

// ─── EventBus ──────────────────────────────────────────

export class EventBus {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private source: EventSource;

  constructor(config: EventBusConfig, source: EventSource) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ...config.kafkaConfig,
    });
    this.source = source;
  }

  // ─── Producer ──────────────────────────────────────

  async connectProducer(): Promise<void> {
    this.producer = this.kafka.producer();
    await this.producer.connect();
  }

  async publish<T = Record<string, unknown>>(
    topic: KafkaTopic,
    eventType: EventType,
    data: T,
    metadata?: Partial<EventMetadata>,
  ): Promise<string> {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connectProducer() first.');
    }

    const eventId = randomUUID();
    const event: PlatformEvent<T> = {
      event_id: eventId,
      event_type: eventType,
      source: this.source,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data,
      metadata: {
        correlation_id: metadata?.correlation_id ?? randomUUID(),
        trace_id: metadata?.trace_id,
        customer_id: metadata?.customer_id,
        actor_id: metadata?.actor_id,
      },
    };

    await this.producer.send({
      topic,
      messages: [
        {
          key: metadata?.customer_id ?? eventId,
          value: JSON.stringify(event),
          headers: {
            'event-type': eventType,
            'source': this.source,
            'correlation-id': event.metadata.correlation_id,
          },
        },
      ],
    });

    return eventId;
  }

  // ─── Consumer ──────────────────────────────────────

  async connectConsumer(groupId: string): Promise<void> {
    this.consumer = this.kafka.consumer({ groupId });
    await this.consumer.connect();
  }

  async subscribe(topics: KafkaTopic[]): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not connected. Call connectConsumer() first.');
    }

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;

        const event = JSON.parse(message.value.toString()) as PlatformEvent;
        const handlers = this.handlers.get(event.event_type) ?? [];

        for (const handler of handlers) {
          try {
            await handler(event, topic);
          } catch (error) {
            // Log but don't crash — individual handler failures shouldn't block others
            console.error(`[EventBus] Handler error for ${event.event_type}:`, error);
          }
        }
      },
    });
  }

  on<T = Record<string, unknown>>(eventType: EventType, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventType, existing);
  }

  // ─── Lifecycle ─────────────────────────────────────

  async disconnect(): Promise<void> {
    await this.producer?.disconnect();
    await this.consumer?.disconnect();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch {
      return false;
    }
  }
}
