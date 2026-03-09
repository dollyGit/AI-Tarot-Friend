/**
 * Redis Cache Service — Singleton
 */
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

class CacheService {
  private static instance: CacheService;
  private client: Redis;

  private constructor() {
    this.client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) return null; // Stop retrying
        return Math.min(times * 200, 5000);
      },
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  getClient(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const result = await this.client.incr(key);
    if (result === 1 && ttlSeconds) {
      await this.client.expire(key, ttlSeconds);
    }
    return result;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

export const cache = CacheService.getInstance();
