import type { IRedisService } from '@/interfaces/IRedisService';
import type { BCVRateData } from '@/services/bcv.service';
import type { ICacheService } from '@/services/cache.interface';
import { NotificationStateService } from '@/services/notification-state.service';
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
  saveNotificationState: vi.fn(),
  getNotificationState: vi.fn(),
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

describe('NotificationStateService', () => {
  let notificationStateService: NotificationStateService;
  let mockCacheService: ICacheService;
  let mockRedisService: IRedisService;

  beforeEach(() => {
    mockCacheService = createMockCacheService();
    mockRedisService = createMockRedisService();

    notificationStateService = new NotificationStateService(
      mockCacheService,
      mockRedisService
    );
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(notificationStateService).toBeDefined();
    });
  });

  describe('getLastNotificationState', () => {
    it('should return state from Redis if available', async () => {
      const mockState = {
        lastNotifiedRate: {
          date: '2025-01-01',
          rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        },
        lastNotificationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockRedisService.get).mockResolvedValue(mockState);

      const result = await notificationStateService.getLastNotificationState();

      expect(result).toEqual(mockState);
      expect(mockRedisService.get).toHaveBeenCalledWith(
        'notification_state:last_notification'
      );
      expect(mockCacheService.getNotificationState).not.toHaveBeenCalled();
    });

    it('should return state from MongoDB if not in Redis', async () => {
      const mockState = {
        lastNotifiedRate: {
          date: '2025-01-01',
          rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        },
        lastNotificationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRedisService.get).mockResolvedValue(null);
      vi.mocked(mockCacheService.getNotificationState).mockResolvedValue(
        mockState
      );

      const result = await notificationStateService.getLastNotificationState();

      expect(result).toEqual(mockState);
      expect(mockRedisService.get).toHaveBeenCalledWith(
        'notification_state:last_notification'
      );
      expect(mockCacheService.getNotificationState).toHaveBeenCalledWith(
        'last_notification'
      );
    });

    it('should cache state in Redis when retrieved from MongoDB', async () => {
      const mockState = {
        lastNotifiedRate: {
          date: '2025-01-01',
          rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        },
        lastNotificationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRedisService.get).mockResolvedValue(null);
      vi.mocked(mockCacheService.getNotificationState).mockResolvedValue(
        mockState
      );

      await notificationStateService.getLastNotificationState();

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'notification_state:last_notification',
        mockState
      );
    });

    it('should return null when no state exists in either Redis or MongoDB', async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);
      vi.mocked(mockCacheService.getNotificationState).mockResolvedValue(null);

      const result = await notificationStateService.getLastNotificationState();

      expect(result).toBeNull();
    });

    it('should handle Redis set error gracefully', async () => {
      const mockState = {
        lastNotifiedRate: {
          date: '2025-01-01',
          rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        },
        lastNotificationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRedisService.get).mockResolvedValue(null);
      vi.mocked(mockCacheService.getNotificationState).mockResolvedValue(
        mockState
      );
      vi.mocked(mockRedisService.set).mockRejectedValue(
        new Error('Redis error')
      );

      const result = await notificationStateService.getLastNotificationState();

      expect(result).toEqual(mockState);
      // Even though Redis set failed, the function should still return the state
    });
  });

  describe('updateNotificationState', () => {
    it('should save state to both MongoDB and Redis', async () => {
      const mockRateData: BCVRateData = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };

      await notificationStateService.updateNotificationState(mockRateData);

      expect(mockCacheService.saveNotificationState).toHaveBeenCalledWith(
        'last_notification',
        expect.objectContaining({
          lastNotifiedRate: mockRateData,
        })
      );

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'notification_state:last_notification',
        expect.objectContaining({
          lastNotifiedRate: mockRateData,
        })
      );
    });

    it('should handle Redis set error gracefully', async () => {
      const mockRateData: BCVRateData = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };

      vi.mocked(mockRedisService.set).mockRejectedValue(
        new Error('Redis error')
      );

      // Should not throw, even if Redis fails
      await expect(
        notificationStateService.updateNotificationState(mockRateData)
      ).resolves.not.toThrow();

      // But MongoDB should still be called
      expect(mockCacheService.saveNotificationState).toHaveBeenCalledWith(
        'last_notification',
        expect.objectContaining({
          lastNotifiedRate: mockRateData,
        })
      );
    });
  });

  describe('hasSignificantChangeAndNotify', () => {
    it('should return false when there is no previous state', async () => {
      vi.mocked(mockRedisService.get).mockResolvedValue(null);
      vi.mocked(mockCacheService.getNotificationState).mockResolvedValue(null);

      const currentRate = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };

      const result =
        await notificationStateService.hasSignificantChangeAndNotify(
          currentRate
        );

      expect(result).toBe(false);
    });

    it('should return true and update state when there is a significant change', async () => {
      const previousState = {
        lastNotifiedRate: {
          date: '2024-12-31',
          rates: [{ currency: 'USD', rate: 36.0, name: 'Dólar' }],
        },
        lastNotificationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const currentRate = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }], // Change of 0.5, above threshold of 0.01
      };

      vi.mocked(mockRedisService.get).mockResolvedValue(previousState);

      const result =
        await notificationStateService.hasSignificantChangeAndNotify(
          currentRate
        );

      expect(result).toBe(true);
      expect(mockCacheService.saveNotificationState).toHaveBeenCalledWith(
        'last_notification',
        expect.objectContaining({
          lastNotifiedRate: currentRate,
        })
      );
    });

    it('should return false when change is below threshold', async () => {
      const previousState = {
        lastNotifiedRate: {
          date: '2024-12-31',
          rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        },
        lastNotificationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const currentRate = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.51, name: 'Dólar' }], // Change of 0.01, equal to threshold
      };

      vi.mocked(mockRedisService.get).mockResolvedValue(previousState);

      const result =
        await notificationStateService.hasSignificantChangeAndNotify(
          currentRate
        );

      expect(result).toBe(false);
    });

    it('should return true when there is a new currency', async () => {
      const previousState = {
        lastNotifiedRate: {
          date: '2024-12-31',
          rates: [{ currency: 'USD', rate: 36.0, name: 'Dólar' }],
        },
        lastNotificationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const currentRate = {
        date: '2025-01-01',
        rates: [
          { currency: 'USD', rate: 36.0, name: 'Dólar' },
          { currency: 'EUR', rate: 40.0, name: 'Euro' }, // New currency
        ],
      };

      vi.mocked(mockRedisService.get).mockResolvedValue(previousState);

      const result =
        await notificationStateService.hasSignificantChangeAndNotify(
          currentRate
        );

      expect(result).toBe(true);
      expect(mockCacheService.saveNotificationState).toHaveBeenCalledWith(
        'last_notification',
        expect.objectContaining({
          lastNotifiedRate: currentRate,
        })
      );
    });

    it('should handle errors gracefully and return false', async () => {
      vi.mocked(mockRedisService.get).mockRejectedValue(
        new Error('Database error')
      );

      const currentRate = {
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
      };

      const result =
        await notificationStateService.hasSignificantChangeAndNotify(
          currentRate
        );

      expect(result).toBe(false);
    });
  });
});
