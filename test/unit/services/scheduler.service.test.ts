import type { IBCVService } from '@/interfaces/IBCVService';
import type { IMetricsService } from '@/interfaces/IMetricsService';
import type { IWebSocketService } from '@/interfaces/IWebSocketService';
import type { IWebhookService } from '@/interfaces/IWebhookService';
import type { ICacheService } from '@/services/cache.interface';
import { SchedulerService } from '@/services/scheduler.service';
import cron from 'node-cron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the node-cron module
vi.mock('node-cron', () => {
  const mockScheduledTask = {
    stop: vi.fn(),
  };

  const schedule = vi.fn((_expression, _callback) => {
    return mockScheduledTask;
  });

  return {
    default: {
      schedule,
      ScheduledTask: mockScheduledTask,
    },
  };
});

// Mock interfaces
const createMockBCVService = (): IBCVService => ({
  getCurrentRate: vi.fn(),
});

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

const createMockWebSocketService = (): IWebSocketService => ({
  getConnectedClientsCount: vi.fn(),
  broadcastRateUpdate: vi.fn(),
});

const createMockMetricsService = (): IMetricsService => ({
  getMetrics: vi.fn(),
  requestMiddleware: vi.fn(),
  incrementBCVUpdateSuccess: vi.fn(),
  incrementBCVUpdateFailure: vi.fn(),
  setLatestRate: vi.fn(),
  setConnectedClients: vi.fn(),
  recordWebhookSuccess: vi.fn(),
  recordWebhookFailure: vi.fn(),
  recordCacheHit: vi.fn(),
  recordCacheMiss: vi.fn(),
  recordCacheOperation: vi.fn(),
  setRedisConnected: vi.fn(),
});

const createMockWebhookService = (): IWebhookService => ({
  sendRateUpdateNotification: vi.fn(),
});

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  let mockBCVService: IBCVService;
  let mockCacheService: ICacheService;
  let mockWebSocketService: IWebSocketService;
  let mockMetricsService: IMetricsService;
  let mockWebhookService: IWebhookService;
  const mockConfig = {
    cronSchedule: '0 2,10,18 * * *',
    saveToDatabase: true,
  };

  beforeEach(() => {
    mockBCVService = createMockBCVService();
    mockCacheService = createMockCacheService();
    mockWebSocketService = createMockWebSocketService();
    mockMetricsService = createMockMetricsService();
    mockWebhookService = createMockWebhookService();

    schedulerService = new SchedulerService(
      mockBCVService,
      mockCacheService,
      mockWebSocketService,
      mockMetricsService,
      mockWebhookService,
      mockConfig
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Stop any scheduled jobs
    schedulerService.stop();
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies and config', () => {
      expect(schedulerService).toBeDefined();
    });
  });

  describe('start', () => {
    it('should schedule a cron job with the provided schedule', () => {
      schedulerService.start();

      expect(cron.schedule).toHaveBeenCalledWith(
        mockConfig.cronSchedule,
        expect.any(Function)
      );
    });

    it('should set the cronJob property', () => {
      schedulerService.start();

      // We can't directly check the property because it's private,
      // but we can verify the cron.schedule was called
      expect(cron.schedule).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop the scheduled job if it exists', () => {
      schedulerService.start();
      schedulerService.stop();

      expect(cron.schedule).toHaveBeenCalled();
    });

    it('should not throw an error when stopping without a job', () => {
      expect(() => schedulerService.stop()).not.toThrow();
    });
  });

  describe('executeImmediately', () => {
    it('should call updateRate internally', async () => {
      // Mock the private updateRate method by spying on it
      const updateRateSpy = vi.spyOn(schedulerService as any, 'updateRate');

      await schedulerService.executeImmediately();

      expect(updateRateSpy).toHaveBeenCalled();
    });
  });

  describe('updateRate', () => {
    it('should increment failure metric when BCV service returns null', async () => {
      vi.mocked(mockBCVService.getCurrentRate).mockResolvedValue(null);

      await (schedulerService as any).updateRate();

      expect(mockMetricsService.incrementBCVUpdateFailure).toHaveBeenCalled();
    });

    it('should set the latest rate metric when BCV service returns data', async () => {
      const mockRateData = {
        date: '2025-01-01',
        rates: [
          { currency: 'USD', rate: 36.5, name: 'Dólar' },
          { currency: 'EUR', rate: 40.0, name: 'Euro' },
        ],
      };
      vi.mocked(mockBCVService.getCurrentRate).mockResolvedValue(mockRateData);

      await (schedulerService as any).updateRate();

      expect(mockMetricsService.setLatestRate).toHaveBeenCalledWith(36.5);
    });

    it('should save rate to database when there is a significant change and saveToDatabase is true', async () => {
      const mockRateData = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };
      const mockSavedRate = {
        _id: 'test-id',
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        createdAt: new Date(),
      };

      vi.mocked(mockBCVService.getCurrentRate).mockResolvedValue(mockRateData);
      vi.mocked(mockCacheService.getLatestRate).mockResolvedValue(null);
      vi.mocked(mockCacheService.saveRate).mockResolvedValue(mockSavedRate);

      await (schedulerService as any).updateRate();

      expect(mockCacheService.saveRate).toHaveBeenCalledWith({
        rates: mockRateData.rates,
        date: mockRateData.date,
        source: 'bcv',
      });
    });

    it('should broadcast rate update to WebSocket clients when there is a significant change', async () => {
      const mockRateData = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };
      const mockSavedRate = {
        _id: 'test-id',
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        createdAt: new Date(),
      };

      vi.mocked(mockBCVService.getCurrentRate).mockResolvedValue(mockRateData);
      vi.mocked(mockCacheService.getLatestRate).mockResolvedValue(null);
      vi.mocked(mockCacheService.saveRate).mockResolvedValue(mockSavedRate);

      await (schedulerService as any).updateRate();

      expect(mockWebSocketService.broadcastRateUpdate).toHaveBeenCalledWith({
        timestamp: expect.any(String),
        rates: mockRateData.rates,
        change: 0,
        eventType: 'rate-update',
      });
    });

    it('should send webhook notification when there is a significant change', async () => {
      const mockRateData = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };
      const mockSavedRate = {
        _id: 'test-id',
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        createdAt: new Date(),
      };

      vi.mocked(mockBCVService.getCurrentRate).mockResolvedValue(mockRateData);
      vi.mocked(mockCacheService.getLatestRate).mockResolvedValue(null);
      vi.mocked(mockCacheService.saveRate).mockResolvedValue(mockSavedRate);

      await (schedulerService as any).updateRate();

      expect(
        mockWebhookService.sendRateUpdateNotification
      ).toHaveBeenCalledWith(mockSavedRate, null);
    });

    it('should increment success metric when rate is updated successfully', async () => {
      const mockRateData = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };
      const mockSavedRate = {
        _id: 'test-id',
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        createdAt: new Date(),
      };

      vi.mocked(mockBCVService.getCurrentRate).mockResolvedValue(mockRateData);
      vi.mocked(mockCacheService.getLatestRate).mockResolvedValue(null);
      vi.mocked(mockCacheService.saveRate).mockResolvedValue(mockSavedRate);

      await (schedulerService as any).updateRate();

      expect(mockMetricsService.incrementBCVUpdateSuccess).toHaveBeenCalled();
    });

    it('should handle webhook failures gracefully', async () => {
      const mockRateData = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };
      const mockSavedRate = {
        _id: 'test-id',
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        createdAt: new Date(),
      };

      vi.mocked(mockBCVService.getCurrentRate).mockResolvedValue(mockRateData);
      vi.mocked(mockCacheService.getLatestRate).mockResolvedValue(null);
      vi.mocked(mockCacheService.saveRate).mockResolvedValue(mockSavedRate);
      vi.mocked(
        mockWebhookService.sendRateUpdateNotification
      ).mockRejectedValue(new Error('Webhook error'));

      // This should not throw an error even though webhook fails
      await expect(
        (schedulerService as any).updateRate()
      ).resolves.not.toThrow();

      expect(mockMetricsService.incrementBCVUpdateSuccess).toHaveBeenCalled();
    });
  });
});
