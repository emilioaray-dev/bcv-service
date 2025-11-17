/**
 * IRedisService - Interface for Redis cache operations
 *
 * Implements Dependency Inversion Principle (DIP):
 * - Services depend on this abstraction, not on concrete Redis implementation
 *
 * Responsibilities:
 * - Manage Redis connection lifecycle
 * - Provide cache operations (get, set, delete)
 * - Health check functionality
 */
export interface IRedisService {
  /**
   * Connect to Redis server
   */
  connect(): Promise<void>;

  /**
   * Disconnect from Redis server
   */
  disconnect(): Promise<void>;

  /**
   * Check if Redis is connected
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean;

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Parsed value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache (will be JSON stringified)
   * @param ttl - Time to live in seconds (optional)
   */
  set(key: string, value: unknown, ttl?: number): Promise<void>;

  /**
   * Delete key from cache
   * @param key - Cache key to delete
   */
  del(key: string): Promise<void>;

  /**
   * Check if key exists in cache
   * @param key - Cache key to check
   * @returns true if exists, false otherwise
   */
  exists(key: string): Promise<boolean>;

  /**
   * Ping Redis to check health
   * @returns true if Redis responds, false otherwise
   */
  ping(): Promise<boolean>;

  /**
   * Get multiple keys matching a pattern
   * @param pattern - Redis key pattern (e.g., 'bcv:*')
   * @returns Array of matching keys
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Delete multiple keys matching a pattern
   * @param pattern - Redis key pattern
   * @returns Number of keys deleted
   */
  delPattern(pattern: string): Promise<number>;
}

/**
 * Cache key patterns for BCV service
 */
export const CacheKeys = {
  /** Latest rate: bcv:latest_rate */
  LATEST_RATE: 'bcv:latest_rate',

  /** Rate by date: bcv:history:YYYY-MM-DD */
  HISTORY_BY_DATE: (date: string) => `bcv:history:${date}`,

  /** All rates: bcv:all_rates */
  ALL_RATES: 'bcv:all_rates',

  /** Currency specific: bcv:currency:USD */
  CURRENCY: (currency: string) => `bcv:currency:${currency}`,

  /** Health check test key */
  HEALTH_CHECK: 'health:check',
} as const;
