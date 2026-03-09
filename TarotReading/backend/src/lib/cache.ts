import Redis from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class CacheService {
  private static instance: CacheService;
  private client: Redis;

  private constructor() {
    this.client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Reconnect on READONLY error
          return true;
        }
        return false;
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    this.client.on('reconnecting', () => {
      logger.warn('Redis client reconnecting');
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache
   */
  public async get<T = string>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (err) {
      logger.error({ err, key }, 'Cache get failed');
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL (seconds)
   */
  public async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (err) {
      logger.error({ err, key }, 'Cache set failed');
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  public async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      logger.error({ err, key }, 'Cache delete failed');
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  public async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(...keys);
      return keys.length;
    } catch (err) {
      logger.error({ err, pattern }, 'Cache delete pattern failed');
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      logger.error({ err, key }, 'Cache exists check failed');
      return false;
    }
  }

  /**
   * Increment counter
   */
  public async incr(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.client.incr(key);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (err) {
      logger.error({ err, key }, 'Cache increment failed');
      throw err;
    }
  }

  /**
   * Get remaining TTL for key
   */
  public async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (err) {
      logger.error({ err, key }, 'Cache TTL check failed');
      return -1;
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (err) {
      logger.error({ err }, 'Redis health check failed');
      return false;
    }
  }

  /**
   * Close connection
   */
  public async close(): Promise<void> {
    await this.client.quit();
    logger.info('Redis client disconnected');
  }

  /**
   * Get raw client for advanced operations
   */
  public getClient(): Redis {
    return this.client;
  }
}

export const cache = CacheService.getInstance();
