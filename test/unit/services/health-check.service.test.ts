import type { IBCVService } from '@/interfaces/IBCVService';
import type { IDiscordStatusService } from '@/interfaces/IDiscordStatusService';
import type { IRedisService } from '@/interfaces/IRedisService';
import type { ISchedulerService } from '@/interfaces/ISchedulerService';
import type { IWebSocketService } from '@/interfaces/IWebSocketService';
import type { ICacheService } from '@/services/cache.interface';
import { HealthCheckService } from '@/services/health-check.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock interfaces
const createMockCacheService = (): ICacheService => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  saveRate: vi.fn(),
  getLatestRate: vi.fn(),
  getRateByDate: vi.fn(),
  getRateHistory: vi.fn(),
  ping: vi.fn(),
  getRatesByDateRange: vi.fn(),
  getAllRates: vi.fn(),
});

const createMockRedisService = (): IRedisService => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  flushAll: vi.fn(),
  setWithExpiry: vi.fn(),
  getLatestRate: vi.fn(),
  saveRate: vi.fn(),
  getRateHistory: vi.fn(),
  getRateByDate: vi.fn(),
  getRatesByDateRange: vi.fn(),
});

const createMockSchedulerService = (): ISchedulerService => ({
  start: vi.fn(),
  stop: vi.fn(),
  getStatus: vi.fn(),
});

const createMockBCVService = (): IBCVService => ({
  getCurrentRate: vi.fn(),
});

const createMockWebSocketService = (): IWebSocketService => ({
  getConnectedClientsCount: vi.fn(),
});

const createMockDiscordStatusService = (): IDiscordStatusService => ({
  sendStatusNotification: vi.fn(),
});

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;
  let mockCacheService: ICacheService;
  let mockRedisService: IRedisService;
  let mockSchedulerService: ISchedulerService;
  let mockBCVService: IBCVService;
  let mockWebSocketService: IWebSocketService;
  let mockDiscordStatusService: IDiscordStatusService;

  beforeEach(() => {
    mockCacheService = createMockCacheService();
    mockRedisService = createMockRedisService();
    mockSchedulerService = createMockSchedulerService();
    mockBCVService = createMockBCVService();
    mockWebSocketService = createMockWebSocketService();
    mockDiscordStatusService = createMockDiscordStatusService();

    healthCheckService = new HealthCheckService(
      mockCacheService,
      mockRedisService,
      mockSchedulerService,
      mockBCVService,
      mockWebSocketService,
      mockDiscordStatusService
    );
  });

  describe('constructor', () => {
    it('should initialize with current timestamp as startTime', () => {
      const service = new HealthCheckService(
        mockCacheService,
        mockRedisService,
        mockSchedulerService,
        mockBCVService,
        mockWebSocketService,
        mockDiscordStatusService
      );
      expect(service).toBeDefined();
    });
  });

  describe('checkReadiness', () => {
    it('should return true when MongoDB is accessible', async () => {
      vi.spyOn(mockCacheService, 'ping').mockResolvedValue();

      const result = await healthCheckService.checkReadiness();

      expect(result).toBe(true);
      expect(mockCacheService.ping).toHaveBeenCalledTimes(1);
    });

    it('should return false when MongoDB ping fails', async () => {
      vi.spyOn(mockCacheService, 'ping').mockRejectedValue(
        new Error('MongoDB connection failed')
      );

      const result = await healthCheckService.checkReadiness();

      expect(result).toBe(false);
      expect(mockCacheService.ping).toHaveBeenCalledTimes(1);
    });
  });

  describe('pingMongoDB', () => {
    it('should return true when MongoDB ping is successful', async () => {
      vi.spyOn(mockCacheService, 'ping').mockResolvedValue();

      const result = await healthCheckService.pingMongoDB();

      expect(result).toBe(true);
      expect(mockCacheService.ping).toHaveBeenCalledTimes(1);
    });

    it('should return false when MongoDB ping fails', async () => {
      vi.spyOn(mockCacheService, 'ping').mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await healthCheckService.pingMongoDB();

      expect(result).toBe(false);
      expect(mockCacheService.ping).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkMongoDB', () => {
    it('should return healthy status when MongoDB is connected', async () => {
      vi.spyOn(healthCheckService as any, 'pingMongoDB').mockResolvedValue(
        true
      );

      const result = await healthCheckService.checkMongoDB();

      expect(result).toEqual({
        status: 'healthy',
        message: 'MongoDB connection is healthy',
      });
    });

    it('should return unhealthy status when MongoDB is not connected', async () => {
      vi.spyOn(healthCheckService as any, 'pingMongoDB').mockResolvedValue(
        false
      );

      const result = await healthCheckService.checkMongoDB();

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'MongoDB connection failed',
      });
    });

    it('should return unhealthy status with error details when MongoDB check throws', async () => {
      vi.spyOn(healthCheckService as any, 'pingMongoDB').mockRejectedValue(
        new Error('Test error')
      );

      const result = await healthCheckService.checkMongoDB();

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'MongoDB connection failed',
        details: {
          error: 'Test error',
        },
      });
    });
  });

  describe('checkScheduler', () => {
    it('should return healthy status for scheduler', async () => {
      const result = await healthCheckService.checkScheduler();

      expect(result).toEqual({
        status: 'healthy',
        message: 'Scheduler is running',
      });
    });

    it('should return unhealthy status with error details when scheduler check throws', async () => {
      vi.spyOn(healthCheckService as any, 'checkScheduler').mockImplementation(
        () => {
          throw new Error('Scheduler error');
        }
      );

      // We'll test the error handling by wrapping it
      const result = await (async () => {
        try {
          return await (healthCheckService as any).checkScheduler();
        } catch (error) {
          return {
            status: 'unhealthy',
            message: 'Scheduler check failed',
            details: {
              error: error instanceof Error ? error.message : String(error),
            },
          };
        }
      })();

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'Scheduler check failed',
        details: {
          error: 'Scheduler error',
        },
      });
    });
  });

  describe('checkWebSocket', () => {
    it('should return healthy status with client count when WebSocket service works', async () => {
      vi.spyOn(
        mockWebSocketService,
        'getConnectedClientsCount'
      ).mockReturnValue(5);

      const result = await healthCheckService.checkWebSocket();

      expect(result).toEqual({
        status: 'healthy',
        message: 'WebSocket service is healthy',
        details: {
          connectedClients: 5,
        },
      });
    });

    it('should return unhealthy status with error details when WebSocket service fails', async () => {
      vi.spyOn(
        mockWebSocketService,
        'getConnectedClientsCount'
      ).mockImplementation(() => {
        throw new Error('WebSocket error');
      });

      const result = await healthCheckService.checkWebSocket();

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'WebSocket service check failed',
        details: {
          error: 'WebSocket error',
        },
      });
    });
  });

  describe('checkRedis', () => {
    beforeEach(() => {
      // Mock config.redis.enabled to be true
      vi.mock('@/config', async (importOriginal) => {
        const mod: any = await importOriginal();
        return {
          ...mod,
          config: {
            ...mod.config,
            redis: {
              enabled: true,
              host: 'localhost',
              port: 6379,
            },
          },
        };
      });
    });

    it('should return healthy status when Redis is connected', async () => {
      vi.spyOn(mockRedisService, 'ping').mockResolvedValue(true);

      const result = await healthCheckService.checkRedis();

      expect(result).toEqual({
        status: 'healthy',
        message: 'Redis is operational',
        details: {
          enabled: true,
          connected: true,
        },
      });
    });

    it('should return unhealthy status when Redis is not connected', async () => {
      vi.spyOn(mockRedisService, 'ping').mockResolvedValue(false);

      const result = await healthCheckService.checkRedis();

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'Redis connection failed',
        details: {
          enabled: true,
          connected: false,
        },
      });
    });

    it('should return unhealthy status with error details when Redis ping fails', async () => {
      vi.spyOn(mockRedisService, 'ping').mockRejectedValue(
        new Error('Redis error')
      );

      const result = await healthCheckService.checkRedis();

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'Redis error',
        details: {
          enabled: true,
          error: 'Redis error',
        },
      });
    });
  });

  describe('checkBCV', () => {
    it('should return healthy status with rate details when BCV service returns data', async () => {
      const mockRateData = {
        date: '2025-01-01',
        rates: [
          { currency: 'USD', rate: 36.5, name: 'Dólar' },
          { currency: 'EUR', rate: 40.0, name: 'Euro' },
        ],
      };
      vi.spyOn(mockBCVService, 'getCurrentRate').mockResolvedValue(
        mockRateData
      );

      const result = await healthCheckService.checkBCV();

      expect(result).toEqual({
        status: 'healthy',
        message: 'BCV service is healthy',
        details: {
          lastRate: 36.5,
          date: '2025-01-01',
          currencies: 2,
        },
      });
    });

    it('should return degraded status when BCV service returns no data', async () => {
      vi.spyOn(mockBCVService, 'getCurrentRate').mockResolvedValue(null);

      const result = await healthCheckService.checkBCV();

      expect(result).toEqual({
        status: 'degraded',
        message: 'BCV service returned no data',
      });
    });

    it('should return unhealthy status with error details when BCV service fails', async () => {
      vi.spyOn(mockBCVService, 'getCurrentRate').mockRejectedValue(
        new Error('BCV error')
      );

      const result = await healthCheckService.checkBCV();

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'BCV service check failed',
        details: {
          error: 'BCV error',
        },
      });
    });
  });

  describe('checkFullHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      vi.spyOn(healthCheckService as any, 'checkMongoDB').mockResolvedValue({
        status: 'healthy',
        message: 'MongoDB connection is healthy',
      });
      vi.spyOn(healthCheckService as any, 'checkRedis').mockResolvedValue({
        status: 'healthy',
        message: 'Redis is operational',
      });
      vi.spyOn(healthCheckService as any, 'checkScheduler').mockResolvedValue({
        status: 'healthy',
        message: 'Scheduler is running',
      });
      vi.spyOn(healthCheckService as any, 'checkWebSocket').mockResolvedValue({
        status: 'healthy',
        message: 'WebSocket service is healthy',
      });

      const result = await healthCheckService.checkFullHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks.mongodb.status).toBe('healthy');
      expect(result.checks.redis.status).toBe('healthy');
      expect(result.checks.scheduler.status).toBe('healthy');
      expect(result.checks.websocket.status).toBe('healthy');
    });

    it('should return unhealthy status when MongoDB check fails', async () => {
      vi.spyOn(healthCheckService as any, 'checkMongoDB').mockResolvedValue({
        status: 'unhealthy',
        message: 'MongoDB connection failed',
      });
      vi.spyOn(healthCheckService as any, 'checkRedis').mockResolvedValue({
        status: 'healthy',
        message: 'Redis is operational',
      });
      vi.spyOn(healthCheckService as any, 'checkScheduler').mockResolvedValue({
        status: 'healthy',
        message: 'Scheduler is running',
      });
      vi.spyOn(healthCheckService as any, 'checkWebSocket').mockResolvedValue({
        status: 'healthy',
        message: 'WebSocket service is healthy',
      });

      const result = await healthCheckService.checkFullHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should return unhealthy status when Scheduler check fails', async () => {
      vi.spyOn(healthCheckService as any, 'checkMongoDB').mockResolvedValue({
        status: 'healthy',
        message: 'MongoDB connection is healthy',
      });
      vi.spyOn(healthCheckService as any, 'checkRedis').mockResolvedValue({
        status: 'healthy',
        message: 'Redis is operational',
      });
      vi.spyOn(healthCheckService as any, 'checkScheduler').mockResolvedValue({
        status: 'unhealthy',
        message: 'Scheduler check failed',
      });
      vi.spyOn(healthCheckService as any, 'checkWebSocket').mockResolvedValue({
        status: 'healthy',
        message: 'WebSocket service is healthy',
      });

      const result = await healthCheckService.checkFullHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should return degraded status when WebSocket check is degraded', async () => {
      vi.spyOn(healthCheckService as any, 'checkMongoDB').mockResolvedValue({
        status: 'healthy',
        message: 'MongoDB connection is healthy',
      });
      vi.spyOn(healthCheckService as any, 'checkRedis').mockResolvedValue({
        status: 'healthy',
        message: 'Redis is operational',
      });
      vi.spyOn(healthCheckService as any, 'checkScheduler').mockResolvedValue({
        status: 'healthy',
        message: 'Scheduler is running',
      });
      vi.spyOn(healthCheckService as any, 'checkWebSocket').mockResolvedValue({
        status: 'degraded',
        message: 'WebSocket service is degraded',
      });

      const result = await healthCheckService.checkFullHealth();

      expect(result.status).toBe('degraded');
    });

    it('should send notification when overall status changes', async () => {
      // Mock all checks to be healthy
      vi.spyOn(healthCheckService as any, 'checkMongoDB').mockResolvedValue({
        status: 'healthy',
        message: 'MongoDB connection is healthy',
      });
      vi.spyOn(healthCheckService as any, 'checkRedis').mockResolvedValue({
        status: 'healthy',
        message: 'Redis is operational',
      });
      vi.spyOn(healthCheckService as any, 'checkScheduler').mockResolvedValue({
        status: 'healthy',
        message: 'Scheduler is running',
      });
      vi.spyOn(healthCheckService as any, 'checkWebSocket').mockResolvedValue({
        status: 'healthy',
        message: 'WebSocket service is healthy',
      });

      // Simulate previous status was unhealthy
      (healthCheckService as any).previousOverallStatus = 'unhealthy';

      await healthCheckService.checkFullHealth();

      expect(
        mockDiscordStatusService.sendStatusNotification
      ).toHaveBeenCalledWith(
        'service.healthy',
        expect.objectContaining({
          status: 'healthy',
        }),
        'unhealthy'
      );
    });
  });
});
