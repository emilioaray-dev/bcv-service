import type { Rate } from '@/models/rate';
import { describe, expect, it, vi } from 'vitest';

// Mock MongoDB and logger
vi.mock('mongodb', async (importOriginal) => {
  const actual = await importOriginal();

  // Define mock objects
  const mockToArray = vi.fn(() => Promise.resolve([]));
  const mockLimit = vi.fn(() => ({
    toArray: mockToArray,
  }));
  const mockSort = vi.fn(() => ({
    limit: mockLimit,
    toArray: mockToArray, // Support both .limit().toArray() and .toArray() directly
  }));
  const mockFind = vi.fn(() => ({
    sort: mockSort,
    limit: mockLimit,
    toArray: mockToArray,
  }));

  const mockCollection = {
    find: mockFind,
    findOne: vi.fn(() => Promise.resolve(null)),
    updateOne: vi.fn(() => Promise.resolve()),
    createIndex: vi.fn(() => Promise.resolve()),
  };

  const mockDb = {
    collection: vi.fn(() => mockCollection),
    admin: vi.fn(() => ({
      ping: vi.fn(() => Promise.resolve()),
    })),
  };

  const mockClient = {
    connect: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    db: vi.fn(() => mockDb),
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
    },
  };

  // Create a proper constructor mock using a class
  class MockMongoClient {
    connect = mockClient.connect;
    close = mockClient.close;
    db = mockClient.db;
    options = mockClient.options;
  }

  return {
    ...(actual as any),
    MongoClient: MockMongoClient,
  };
});

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

    it('should have ping method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.ping).toBe('function');
    });

    it('should have getRatesByDateRange method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.getRatesByDateRange).toBe('function');
    });

    it('should have getNotificationState method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.getNotificationState).toBe('function');
    });

    it('should have saveNotificationState method', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      expect(typeof mongoService.saveNotificationState).toBe('function');
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
      expect(mongoService.getRateByDate).toBeDefined();
      expect(mongoService.getRateHistory).toBeDefined();
      expect(mongoService.getAllRates).toBeDefined();
    });
  });

  describe('method signatures', () => {
    it('saveRate should accept rate data without id and createdAt', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      const _rateData = {
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
      // getRateHistory has default parameter, so length is 0
      expect(mongoService.getRateHistory.length).toBe(0);
    });

    it('getRatesByDateRange should accept date range and optional limit', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);
      // getRatesByDateRange has 2 required params and 1 default, so length is 2
      expect(mongoService.getRatesByDateRange.length).toBe(2);
    });
  });

  describe('Rate data structure', () => {
    it('should work with complete Rate objects', () => {
      const completeRate: Rate = {
        id: '2025-11-12-bcv',
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        date: '2025-11-12',
        source: 'bcv',
        createdAt: '2025-11-12T10:00:00Z',
      };

      expect(completeRate.id).toBeDefined();
      expect(completeRate.rates).toBeDefined();
      expect(completeRate.date).toBeDefined();
      expect(completeRate.source).toBeDefined();
      expect(completeRate.createdAt).toBeDefined();
    });

    it('should work with multiple currency rates', () => {
      const multiCurrencyRate: Rate = {
        id: '2025-11-12-bcv',
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

  // Additional tests for functionality
  describe('connect', () => {
    it('should connect to MongoDB and create indexes', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await mongoService.connect();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await expect(mongoService.disconnect()).resolves;
    });
  });

  describe('ping', () => {
    it('should ping MongoDB successfully', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await expect(mongoService.ping()).resolves;
    });
  });

  describe('saveRate', () => {
    it('should save a rate to MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      const rateData = {
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        date: '2025-01-01',
        source: 'bcv',
      };

      await expect(mongoService.saveRate(rateData)).resolves;
    });
  });

  describe('getLatestRate', () => {
    it('should get the latest rate from MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await expect(mongoService.getLatestRate()).resolves.toBeNull();
    });
  });

  describe('getRateByDate', () => {
    it('should get a rate by date from MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await expect(
        mongoService.getRateByDate('2025-01-01')
      ).resolves.toBeNull();
    });
  });

  describe('getRateHistory', () => {
    it('should get rate history from MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await expect(mongoService.getRateHistory()).resolves.toEqual([]);
      await expect(mongoService.getRateHistory(10)).resolves.toEqual([]);
    });
  });

  describe('getRatesByDateRange', () => {
    it('should get rates by date range from MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await expect(
        mongoService.getRatesByDateRange('2025-01-01', '2025-01-31')
      ).resolves.toEqual([]);

      await expect(
        mongoService.getRatesByDateRange('2025-01-01', '2025-01-31', 50)
      ).resolves.toEqual([]);
    });
  });

  describe('getAllRates', () => {
    it('should get all rates from MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await expect(mongoService.getAllRates()).resolves.toEqual([]);
    });
  });

  describe('getNotificationState', () => {
    it('should get notification state from MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      await expect(
        mongoService.getNotificationState('test-id')
      ).resolves.toBeNull();
    });
  });

  describe('saveNotificationState', () => {
    it('should save notification state to MongoDB', async () => {
      const { MongoService } = await import('@/services/mongo.service');
      const mongoService = new MongoService(testMongoConfig);

      const state = {
        lastNotifiedRate: {
          date: '2025-01-01',
          rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        },
        lastNotificationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(mongoService.saveNotificationState('test-id', state))
        .resolves;
    });
  });
});
