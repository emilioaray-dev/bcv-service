import { RedisService } from '@/services/redis.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Shared mock instance
let mockRedisInstance: any = null;

// Mock Redis and config
vi.mock('ioredis', () => {
  class MockRedis {
    on = vi.fn();
    ping = vi.fn(() => Promise.resolve('PONG'));
    get = vi.fn();
    set = vi.fn(() => Promise.resolve('OK'));
    setex = vi.fn(() => Promise.resolve('OK'));
    del = vi.fn(() => Promise.resolve(1));
    exists = vi.fn(() => Promise.resolve(1));
    keys = vi.fn(() => Promise.resolve([]));
    quit = vi.fn(() => Promise.resolve());

    constructor() {
      mockRedisInstance = this;
    }
  }

  return {
    default: MockRedis,
  };
});

vi.mock('@/config', () => ({
  config: {
    redis: {
      enabled: true,
      host: 'localhost',
      port: 6379,
      password: 'password',
      db: 0,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      retryDelay: 1000,
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('RedisService', () => {
  let redisService: RedisService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstance = null;
    redisService = new RedisService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize without errors', () => {
      expect(redisService).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect to Redis when enabled', async () => {
      await expect(redisService.connect()).resolves;
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      await redisService.connect(); // First connect
      await expect(redisService.disconnect()).resolves;
    });

    it('should handle disconnect when client does not exist', async () => {
      const service = new RedisService();
      await expect(service.disconnect()).resolves;
    });
  });

  describe('isConnected', () => {
    it('should return connection status', async () => {
      // Initially not connected
      expect(redisService.isConnected()).toBe(false);

      // After connecting
      await redisService.connect();
      expect(redisService.isConnected()).toBe(true);
    });
  });

  describe('get', () => {
    it('should return null when Redis is not connected', async () => {
      await redisService.connect();
      vi.spyOn(redisService, 'isConnected').mockReturnValue(false);

      const result = await redisService.get('test-key');
      expect(result).toBeNull();
    });

    it('should return value from Redis', async () => {
      await redisService.connect();
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ test: 'data' }));

      const result = await redisService.get('test-key');
      expect(result).toEqual({ test: 'data' });
    });

    it('should handle null value from Redis', async () => {
      await redisService.connect();
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await redisService.get('test-key');
      expect(result).toBeNull();
    });

    it('should return raw string if JSON parsing fails', async () => {
      await redisService.connect();
      mockRedisInstance.get.mockResolvedValue('raw string value');

      const result = await redisService.get('test-key');
      expect(result).toBe('raw string value');
    });
  });

  describe('set', () => {
    it('should skip set operation when Redis is not connected', async () => {
      vi.spyOn(redisService, 'isConnected').mockReturnValue(false);

      await expect(redisService.set('test-key', 'test-value')).resolves;
    });

    it('should set value in Redis without TTL', async () => {
      await redisService.connect();

      await redisService.set('test-key', 'test-value');

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'test-key',
        'test-value'
      );
    });

    it('should set value in Redis with TTL', async () => {
      await redisService.connect();

      await redisService.set('test-key', 'test-value', 3600);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        'test-value'
      );
    });
  });

  describe('del', () => {
    it('should skip delete operation when Redis is not connected', async () => {
      vi.spyOn(redisService, 'isConnected').mockReturnValue(false);

      await expect(redisService.del('test-key')).resolves;
    });

    it('should delete key from Redis', async () => {
      await redisService.connect();

      await redisService.del('test-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('exists', () => {
    it('should return false when Redis is not connected', async () => {
      vi.spyOn(redisService, 'isConnected').mockReturnValue(false);

      const result = await redisService.exists('test-key');
      expect(result).toBe(false);
    });

    it('should return true if key exists', async () => {
      await redisService.connect();
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await redisService.exists('test-key');
      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      await redisService.connect();
      mockRedisInstance.exists.mockResolvedValue(0);

      const result = await redisService.exists('test-key');
      expect(result).toBe(false);
    });
  });

  describe('ping', () => {
    it('should return false when client does not exist', async () => {
      const result = await redisService.ping();
      expect(result).toBe(false);
    });

    it('should return true when ping is successful', async () => {
      await redisService.connect();
      const result = await redisService.ping();
      expect(result).toBe(true);
    });

    it('should return false when ping fails', async () => {
      mockRedisInstance = null; // Reset to allow new instance

      // Create a mock that will fail on ping
      vi.doMock('ioredis', () => {
        class MockRedis {
          on = vi.fn();
          ping = vi.fn(() => Promise.reject(new Error('Ping error')));
          quit = vi.fn(() => Promise.resolve());
        }
        return { default: MockRedis };
      });

      const failService = new RedisService();
      const result = await failService.ping();
      expect(result).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return empty array when Redis is not connected', async () => {
      vi.spyOn(redisService, 'isConnected').mockReturnValue(false);

      const result = await redisService.keys('pattern*');
      expect(result).toEqual([]);
    });

    it('should return matching keys', async () => {
      await redisService.connect();
      mockRedisInstance.keys.mockResolvedValue(['key1', 'key2', 'key3']);

      const result = await redisService.keys('pattern*');
      expect(result).toEqual(['key1', 'key2', 'key3']);
    });
  });

  describe('delPattern', () => {
    it('should return 0 when Redis is not connected', async () => {
      vi.spyOn(redisService, 'isConnected').mockReturnValue(false);

      const result = await redisService.delPattern('pattern*');
      expect(result).toBe(0);
    });

    it('should delete keys matching pattern', async () => {
      await redisService.connect();
      mockRedisInstance.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await redisService.delPattern('pattern*');
      expect(result).toBe(3);
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        'key1',
        'key2',
        'key3'
      );
    });

    it('should return 0 when no keys match pattern', async () => {
      await redisService.connect();
      mockRedisInstance.keys.mockResolvedValue([]);

      const result = await redisService.delPattern('pattern*');
      expect(result).toBe(0);
    });
  });
});
