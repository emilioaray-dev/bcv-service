import { config } from '@/config';
import type { IRedisService } from '@/interfaces/IRedisService';
import { logger } from '@/utils/logger';
import { injectable } from 'inversify';
import Redis from 'ioredis';

/**
 * RedisService - Service for Redis cache operations
 *
 * Implements Single Responsibility Principle (SRP):
 * - Responsible only for Redis cache operations
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - JSON serialization/deserialization
 * - TTL support for cache expiration
 * - Pattern-based key operations
 * - Health check functionality
 */
@injectable()
export class RedisService implements IRedisService {
  private client: Redis | null = null;
  private connected = false;

  constructor() {
    if (!config.redis.enabled) {
      logger.warn('Redis cache is disabled - CACHE_ENABLED=false');
    }
  }

  async connect(): Promise<void> {
    if (!config.redis.enabled) {
      logger.info('Skipping Redis connection - cache disabled');
      return;
    }

    if (this.client) {
      logger.warn('Redis client already exists');
      return;
    }

    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
        connectTimeout: config.redis.connectTimeout,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * config.redis.retryDelay, 3000);
          logger.warn(`Redis reconnection attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        lazyConnect: false,
      });

      // Event listeners
      this.client.on('connect', () => {
        logger.info('Redis client connecting...', {
          host: config.redis.host,
          port: config.redis.port,
        });
      });

      this.client.on('ready', () => {
        this.connected = true;
        logger.info('Redis client connected and ready', {
          host: config.redis.host,
          port: config.redis.port,
        });
      });

      this.client.on('error', (error: Error) => {
        logger.error('Redis client error', {
          error: error.message,
          stack: error.stack,
        });
      });

      this.client.on('close', () => {
        this.connected = false;
        logger.warn('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      // Wait for connection
      await this.client.ping();
      this.connected = true;

      logger.info('Redis service initialized successfully');
    } catch (error) {
      this.connected = false;
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: config.redis.host,
        port: config.redis.port,
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected() || !this.client) {
      logger.warn('Redis not connected, skipping get operation', { key });
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (value === null) {
        return null;
      }

      // Try to parse as JSON, fallback to string if not valid JSON
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      logger.error('Error getting value from Redis', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.isConnected() || !this.client) {
      logger.warn('Redis not connected, skipping set operation', { key });
      return;
    }

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl && ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      logger.debug('Value set in Redis', { key, ttl });
    } catch (error) {
      logger.error('Error setting value in Redis', {
        key,
        ttl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected() || !this.client) {
      logger.warn('Redis not connected, skipping delete operation', { key });
      return;
    }

    try {
      await this.client.del(key);
      logger.debug('Key deleted from Redis', { key });
    } catch (error) {
      logger.error('Error deleting key from Redis', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected() || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking key existence in Redis', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected() || !this.client) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Error getting keys from Redis', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async delPattern(pattern: string): Promise<number> {
    if (!this.isConnected() || !this.client) {
      return 0;
    }

    try {
      const keys = await this.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.client.del(...keys);
      logger.debug('Keys deleted from Redis', { pattern, count: deleted });
      return deleted;
    } catch (error) {
      logger.error('Error deleting pattern from Redis', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }
}
