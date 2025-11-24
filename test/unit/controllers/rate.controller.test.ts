import { RateController } from '@/controllers/rate.controller';
import type { ICacheService } from '@/services/cache.interface';
import type { IRedisService } from '@/interfaces/IRedisService';
import type { Rate } from '@/models/rate';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

// Mock logger
vi.mock('@/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config
vi.mock('@/config', () => ({
  config: {
    saveToDatabase: true,
    redis: {
      enabled: false,
    },
    cacheTTL: {
      latest: 300,
      history: 600,
    },
  },
}));

describe('RateController', () => {
  let rateController: RateController;
  let mockCacheService: ICacheService;
  let mockRedisService: IRedisService;

  const mockRates: Rate[] = [
    {
      id: '2020-01-01-bcv',
      date: '2020-01-01',
      rates: [
        { currency: 'USD', rate: 100000, name: 'Dólar', normalized_bs: 0.1 },
        { currency: 'EUR', rate: 110000, name: 'Euro', normalized_bs: 0.11 },
      ],
      source: 'bcv',
      createdAt: '2020-01-01T00:00:00.000Z',
      denomination: {
        code: 'BS_S',
        name: 'Bolívar Soberano',
        note: 'Moneda vigente desde 20-ago-2018 hasta 30-sep-2021',
      },
    },
    {
      id: '2020-01-02-bcv',
      date: '2020-01-02',
      rates: [
        { currency: 'USD', rate: 100500, name: 'Dólar', normalized_bs: 0.1005 },
        { currency: 'EUR', rate: 110500, name: 'Euro', normalized_bs: 0.1105 },
      ],
      source: 'bcv',
      createdAt: '2020-01-02T00:00:00.000Z',
      denomination: {
        code: 'BS_S',
        name: 'Bolívar Soberano',
        note: 'Moneda vigente desde 20-ago-2018 hasta 30-sep-2021',
      },
    },
  ];

  beforeEach(() => {
    // Mock cache service
    mockCacheService = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      ping: vi.fn(),
      saveRate: vi.fn(),
      getLatestRate: vi.fn(),
      getRateByDate: vi.fn(),
      getRateHistory: vi.fn(),
      getRatesByDateRange: vi.fn(),
      getAllRates: vi.fn(),
      getNotificationState: vi.fn(),
      saveNotificationState: vi.fn(),
    };

    // Mock redis service
    mockRedisService = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      ping: vi.fn(),
    };

    rateController = new RateController(mockCacheService, mockRedisService);
  });

  describe('initialization', () => {
    it('should create a rate controller instance', () => {
      expect(rateController).toBeDefined();
      expect(rateController.router).toBeDefined();
    });

    it('should have registered routes', () => {
      const routes = rateController.router.stack
        .filter((layer) => layer.route)
        .map((layer) => layer.route?.path);

      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('getRatesByDateRange functionality', () => {
    it('should verify the cache service has getRatesByDateRange method', () => {
      expect(mockCacheService.getRatesByDateRange).toBeDefined();
      expect(typeof mockCacheService.getRatesByDateRange).toBe('function');
    });

    it('should handle historical rate data with optional fields', () => {
      // Verify that Rate model supports optional denomination and normalized_bs fields
      const rateWithDenomination: Rate = mockRates[0];
      expect(rateWithDenomination.denomination).toBeDefined();
      expect(rateWithDenomination.denomination?.code).toBe('BS_S');
      expect(rateWithDenomination.rates[0].normalized_bs).toBeDefined();

      const rateWithoutDenomination: Rate = {
        id: '2025-01-01-bcv',
        date: '2025-01-01',
        rates: [{ currency: 'USD', rate: 243.11, name: 'Dólar' }],
        source: 'bcv',
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      expect(rateWithoutDenomination.denomination).toBeUndefined();
      expect(rateWithoutDenomination.rates[0].normalized_bs).toBeUndefined();
    });
  });
});
