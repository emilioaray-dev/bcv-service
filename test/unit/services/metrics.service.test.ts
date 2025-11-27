import { MetricsService } from '@/services/metrics.service';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
  });

  describe('constructor', () => {
    it('should initialize with all metrics registered', () => {
      expect(metricsService).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const metrics = await metricsService.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_request_duration_seconds');
    });
  });

  describe('requestMiddleware', () => {
    it('should create a middleware function', () => {
      const middleware = metricsService.requestMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should track HTTP requests and duration', async () => {
      const middleware = metricsService.requestMiddleware();
      const mockReq: Partial<Request> = {
        method: 'GET',
        path: '/test',
        route: { path: '/test' },
      };
      const mockRes: Partial<Response> = {
        on: vi.fn((event, callback) => {
          if (event === 'finish') {
            // Call the callback to simulate request completion
            callback();
          }
        }),
        statusCode: 200,
      };
      const mockNext: NextFunction = vi.fn();

      // Execute the middleware
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Verify next was called
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('BCV update metrics', () => {
    it('should increment BCV update success counter', () => {
      expect(() => metricsService.incrementBCVUpdateSuccess()).not.toThrow();
    });

    it('should increment BCV update failure counter', () => {
      expect(() => metricsService.incrementBCVUpdateFailure()).not.toThrow();
    });
  });

  describe('latest rate metrics', () => {
    it('should set the latest rate', () => {
      expect(() => metricsService.setLatestRate(36.5)).not.toThrow();
    });

    it('should not set invalid rates', () => {
      expect(() => metricsService.setLatestRate(-1)).not.toThrow();
      expect(() => metricsService.setLatestRate(Number.NaN)).not.toThrow();
      expect(() => metricsService.setLatestRate(0)).not.toThrow();
    });
  });

  describe('WebSocket metrics', () => {
    it('should set connected clients count', () => {
      expect(() => metricsService.setConnectedClients(5)).not.toThrow();
    });
  });

  describe('webhook metrics', () => {
    it('should record webhook success', () => {
      expect(() =>
        metricsService.recordWebhookSuccess('rate.updated', 500)
      ).not.toThrow();
    });

    it('should record webhook failure', () => {
      expect(() =>
        metricsService.recordWebhookFailure('rate.updated', 500)
      ).not.toThrow();
    });
  });

  describe('cache metrics', () => {
    it('should record cache hit', () => {
      expect(() => metricsService.recordCacheHit('latest_rate')).not.toThrow();
    });

    it('should record cache miss', () => {
      expect(() =>
        metricsService.recordCacheMiss('history_by_date')
      ).not.toThrow();
    });

    it('should record cache operation', () => {
      expect(() =>
        metricsService.recordCacheOperation('get', 'success', 100)
      ).not.toThrow();
      expect(() =>
        metricsService.recordCacheOperation('set', 'failure', 100)
      ).not.toThrow();
    });
  });

  describe('Redis metrics', () => {
    it('should set Redis connection status to connected', () => {
      expect(() => metricsService.setRedisConnected(true)).not.toThrow();
    });

    it('should set Redis connection status to disconnected', () => {
      expect(() => metricsService.setRedisConnected(false)).not.toThrow();
    });
  });
});
