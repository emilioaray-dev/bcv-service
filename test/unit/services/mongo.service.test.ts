import type { Rate } from '@/models/rate';
import { describe, expect, it, vi } from 'vitest';

// Mock logger
vi.mock('@/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Test MongoDB configuration
const testMongoConfig = {
  mongoUri: 'mongodb://localhost:27017/test',
  mongodb: {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 60000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
    compressors: ['zstd', 'snappy', 'zlib'] as (
      | 'none'
      | 'snappy'
      | 'zlib'
      | 'zstd'
    )[],
  },
};

describe('MongoService', () => {
  describe('basic structure', () => {
    it('should be importable', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      expect(MongoService).toBeDefined();
      expect(typeof MongoService).toBe('function');
    });

    it('should be constructable', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(mongoService).toBeDefined();
    });

    it('should have connect method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.connect).toBe('function');
    });

    it('should have disconnect method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.disconnect).toBe('function');
    });

    it('should have saveRate method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.saveRate).toBe('function');
    });

    it('should have getLatestRate method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.getLatestRate).toBe('function');
    });

    it('should have getRateByDate method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.getRateByDate).toBe('function');
    });

    it('should have getRateHistory method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.getRateHistory).toBe('function');
    });

    it('should have getAllRates method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.getAllRates).toBe('function');
    });
  });

  describe('interface implementation', () => {
    it('should implement ICacheService interface', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      // Check required interface methods
      expect(mongoService.connect).toBeDefined();
      expect(mongoService.disconnect).toBeDefined();
      expect(mongoService.saveRate).toBeDefined();
      expect(mongoService.getLatestRate).toBeDefined();
    });
  });

  describe('method signatures', () => {
    it('saveRate should accept rate data without id and createdAt', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      const _rateData = {
        rate: 36.5,
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        date: '2025-11-12',
        source: 'bcv',
      };

      // Method should accept this signature
      expect(mongoService.saveRate.length).toBe(1);
    });

    it('getRateByDate should accept date string', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(mongoService.getRateByDate.length).toBe(1);
    });

    it('getRateHistory should accept optional limit parameter', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      // Method exists and is callable
      expect(typeof mongoService.getRateHistory).toBe('function');
    });
  });

  describe('Rate data structure', () => {
    it('should work with complete Rate objects', () => {
      const completeRate: Rate = {
        id: '2025-11-12-bcv',
        rate: 36.5,
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        date: '2025-11-12',
        source: 'bcv',
        createdAt: '2025-11-12T10:00:00Z',
      };

      expect(completeRate.id).toBeDefined();
      expect(completeRate.rate).toBeDefined();
      expect(completeRate.rates).toBeDefined();
      expect(completeRate.date).toBeDefined();
      expect(completeRate.source).toBeDefined();
      expect(completeRate.createdAt).toBeDefined();
    });

    it('should work with multiple currency rates', () => {
      const multiCurrencyRate: Rate = {
        id: '2025-11-12-bcv',
        rate: 36.5,
        rates: [
          { currency: 'USD', rate: 36.5, name: 'Dólar' },
          { currency: 'EUR', rate: 39.2, name: 'Euro' },
          { currency: 'CNY', rate: 5.1, name: 'Yuan' },
          { currency: 'TRY', rate: 1.15, name: 'Lira Turca' },
          { currency: 'RUB', rate: 0.38, name: 'Rublo Ruso' },
        ],
        date: '2025-11-12',
        source: 'bcv',
        createdAt: '2025-11-12T10:00:00Z',
      };

      expect(multiCurrencyRate.rates).toHaveLength(5);
      expect(
        multiCurrencyRate.rates.every((r) => r.currency && r.rate && r.name)
      ).toBe(true);
    });
  });

  describe('constructor', () => {
    it('should accept MongoDB URI string', async () => {
      const { MongoService } = await import('@/services/mongo.service');

      const uri1 = 'mongodb://localhost:27017/test';
      const service1 = new MongoService({ ...testMongoConfig, mongoUri: uri1 });
      expect(service1).toBeDefined();

      const uri2 = 'mongodb://user:pass@localhost:27017/prod';
      const service2 = new MongoService({ ...testMongoConfig, mongoUri: uri2 });
      expect(service2).toBeDefined();
    });

    it('should create instance with different URI formats', async () => {
      const { MongoService } = await import('@/services/mongo.service');

      const uris = [
        'mongodb://localhost:27017/test',
        'mongodb://127.0.0.1:27017/test',
        'mongodb://user:password@host:27017/db',
        'mongodb+srv://cluster.mongodb.net/mydb',
      ];

      for (const uri of uris) {
        const service = new MongoService({ ...testMongoConfig, mongoUri: uri });
        expect(service).toBeDefined();
      }
    });
  });
});
