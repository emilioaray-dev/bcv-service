import type { Server as HttpServer } from 'node:http';
import type { RateUpdateEvent } from '@/models/rate';
import type { IMetricsService } from '@/services/metrics.service';
import { describe, expect, it } from 'vitest';

// Mock ws library completely
import { vi } from 'vitest';

vi.mock('ws', () => {
  class MockWebSocketServer {
    on = vi.fn();
    clients = new Set();
  }

  class MockWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = 1;
    send = vi.fn();
    on = vi.fn();
  }

  return {
    Server: MockWebSocketServer,
    WebSocket: MockWebSocket,
  };
});

vi.mock('@/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper function to create mock IMetricsService
const createMockMetricsService = () => ({
  getMetrics: vi.fn(),
  requestMiddleware: vi.fn(),
  incrementBCVUpdateSuccess: vi.fn(),
  incrementBCVUpdateFailure: vi.fn(),
  setLatestRate: vi.fn(),
  setConnectedClients: vi.fn(),
});

describe('WebSocketService', () => {
  describe('module structure', () => {
    it('should export WebSocketService class', async () => {
      const module = await import('@/services/websocket.service');
      expect(module.WebSocketService).toBeDefined();
      expect(typeof module.WebSocketService).toBe('function');
    });
  });

  describe('class interface', () => {
    it('should be constructable with a server parameter', async () => {
      const { WebSocketService } = await import('@/services/websocket.service');
      const mockServer = {
        on: vi.fn(),
        listen: vi.fn(),
      } as unknown as HttpServer;
      const mockMetricsService = createMockMetricsService();

      expect(
        () => new WebSocketService(mockServer, mockMetricsService)
      ).not.toThrow();
    });

    it('should have required methods', async () => {
      const { WebSocketService } = await import('@/services/websocket.service');
      const mockServer = {
        on: vi.fn(),
        listen: vi.fn(),
      } as unknown as HttpServer;
      const mockMetricsService = createMockMetricsService();
      const instance = new WebSocketService(
        mockServer,
        mockMetricsService as IMetricsService
      );

      expect(instance.broadcastRateUpdate).toBeDefined();
      expect(instance.getConnectedClientsCount).toBeDefined();
      expect(typeof instance.broadcastRateUpdate).toBe('function');
      expect(typeof instance.getConnectedClientsCount).toBe('function');
    });
  });

  describe('type safety', () => {
    it('should accept RateUpdateEvent for broadcastRateUpdate', async () => {
      const { WebSocketService } = await import('@/services/websocket.service');
      const mockServer = {
        on: vi.fn(),
        listen: vi.fn(),
      } as unknown as HttpServer;
      const mockMetricsService = createMockMetricsService();
      const instance = new WebSocketService(
        mockServer,
        mockMetricsService as IMetricsService
      );

      const validEvent: RateUpdateEvent = {
        timestamp: '2025-11-12T10:00:00Z',
        rate: 36.5,
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        change: 0.05,
        eventType: 'rate-update',
      };

      // Should not throw
      expect(() => instance.broadcastRateUpdate(validEvent)).not.toThrow();
    });

    it('should handle multi-currency rate updates', async () => {
      const { WebSocketService } = await import('@/services/websocket.service');
      const mockServer = {
        on: vi.fn(),
        listen: vi.fn(),
      } as unknown as HttpServer;
      const mockMetricsService = createMockMetricsService();
      const instance = new WebSocketService(
        mockServer,
        mockMetricsService as IMetricsService
      );

      const multiCurrencyEvent: RateUpdateEvent = {
        timestamp: '2025-11-12T10:00:00Z',
        rate: 36.5,
        rates: [
          { currency: 'USD', rate: 36.5, name: 'Dólar' },
          { currency: 'EUR', rate: 39.2, name: 'Euro' },
          { currency: 'CNY', rate: 5.1, name: 'Yuan' },
          { currency: 'TRY', rate: 1.15, name: 'Lira Turca' },
          { currency: 'RUB', rate: 0.38, name: 'Rublo Ruso' },
        ],
        change: 0.05,
        eventType: 'rate-update',
      };

      expect(() =>
        instance.broadcastRateUpdate(multiCurrencyEvent)
      ).not.toThrow();
    });

    it('should return number from getConnectedClientsCount', async () => {
      const { WebSocketService } = await import('@/services/websocket.service');
      const mockServer = {
        on: vi.fn(),
        listen: vi.fn(),
      } as unknown as HttpServer;
      const mockMetricsService = createMockMetricsService();
      const instance = new WebSocketService(
        mockServer,
        mockMetricsService as IMetricsService
      );

      const count = instance.getConnectedClientsCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('RateUpdateEvent interface', () => {
    it('should validate complete RateUpdateEvent structure', () => {
      const validEvent: RateUpdateEvent = {
        timestamp: '2025-11-12T10:00:00Z',
        rate: 36.5,
        rates: [{ currency: 'USD', rate: 36.5, name: 'Dólar' }],
        change: 0.05,
        eventType: 'rate-update',
      };

      expect(validEvent.timestamp).toBeDefined();
      expect(validEvent.rate).toBeDefined();
      expect(validEvent.rates).toBeDefined();
      expect(validEvent.change).toBeDefined();
      expect(validEvent.eventType).toBeDefined();
      expect(Array.isArray(validEvent.rates)).toBe(true);
    });

    it('should handle multiple currency rates in event', () => {
      const multiCurrencyEvent: RateUpdateEvent = {
        timestamp: '2025-11-12T10:00:00Z',
        rate: 36.5,
        rates: [
          { currency: 'USD', rate: 36.5, name: 'Dólar' },
          { currency: 'EUR', rate: 39.2, name: 'Euro' },
        ],
        change: 0.05,
        eventType: 'rate-update',
      };

      expect(multiCurrencyEvent.rates).toHaveLength(2);
      expect(
        multiCurrencyEvent.rates?.every(
          (r) => r.currency && typeof r.rate === 'number' && r.name
        )
      ).toBe(true);
    });
  });
});
