import type { IMetricsService } from '@/interfaces/IMetricsService';
import { WebhookService } from '@/services/webhook.service';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock config
vi.mock('@/config', () => ({
  config: {
    webhookUrl: 'https://example.com/webhook',
    webhookSecret: 'test-secret-key',
    webhookTimeout: 5000,
    webhookMaxRetries: 3,
  },
}));

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let mockMetricsService: IMetricsService;

  beforeEach(() => {
    mockMetricsService = {
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
    };

    webhookService = new WebhookService(mockMetricsService);
    vi.clearAllMocks();
  });

  describe('isEnabled', () => {
    it('should return true when webhook URL is configured', () => {
      expect(webhookService.isEnabled()).toBe(true);
    });
  });

  describe('sendRateUpdateNotification', () => {
    const mockRateData = {
      date: '2025-11-17',
      rates: [
        { currency: 'USD', rate: 36.5, name: 'Dólar' },
        { currency: 'EUR', rate: 39.2, name: 'Euro' },
      ],
      rate: 36.5,
    };

    const mockPreviousRate = {
      date: '2025-11-16',
      rates: [
        { currency: 'USD', rate: 36.4, name: 'Dólar' },
        { currency: 'EUR', rate: 39.1, name: 'Euro' },
      ],
      rate: 36.4,
    };

    it('should successfully send webhook notification', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      const result = await webhookService.sendRateUpdateNotification(
        mockRateData,
        mockPreviousRate
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempt).toBe(1);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockMetricsService.recordWebhookSuccess).toHaveBeenCalledWith(
        'rate.changed',
        expect.any(Number)
      );
    });

    it('should send webhook with correct payload structure', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await webhookService.sendRateUpdateNotification(
        mockRateData,
        mockPreviousRate
      );

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1] as WebhookPayload;

      expect(payload).toHaveProperty('event', 'rate.changed');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('data');
      expect(payload.data).toHaveProperty('date', '2025-11-17');
      expect(payload.data).toHaveProperty('rates');
      expect(payload.data.rates).toHaveLength(2);
      expect(payload.data).toHaveProperty('change');
      expect(payload.data.change).toHaveProperty('previousRate', 36.4);
      expect(payload.data.change).toHaveProperty('currentRate', 36.5);
      expect(payload.data.change).toHaveProperty('percentageChange');
    });

    it('should send webhook with HMAC signature header', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await webhookService.sendRateUpdateNotification(mockRateData);

      const callArgs = mockedAxios.post.mock.calls[0];
      const headers = callArgs[2]?.headers as Record<string, string>;

      expect(headers).toHaveProperty('X-Webhook-Signature');
      expect(headers['X-Webhook-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should retry on failure with exponential backoff', async () => {
      // Fail first 2 attempts, succeed on 3rd
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true },
        });

      const result =
        await webhookService.sendRateUpdateNotification(mockRateData);

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries and record failure metrics', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result =
        await webhookService.sendRateUpdateNotification(mockRateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.attempt).toBe(3); // maxRetries
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
      expect(mockMetricsService.recordWebhookFailure).toHaveBeenCalledWith(
        'rate.updated',
        expect.any(Number)
      );
    });

    it('should send event type as rate.updated when no previous rate', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await webhookService.sendRateUpdateNotification(mockRateData);

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1] as WebhookPayload;

      expect(payload.event).toBe('rate.updated');
      expect(payload.data.change).toBeUndefined();
    });

    it('should send event type as rate.changed when previous rate exists', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await webhookService.sendRateUpdateNotification(
        mockRateData,
        mockPreviousRate
      );

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1] as WebhookPayload;

      expect(payload.event).toBe('rate.changed');
      expect(payload.data.change).toBeDefined();
    });

    it('should include correct headers in request', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await webhookService.sendRateUpdateNotification(mockRateData);

      const callArgs = mockedAxios.post.mock.calls[0];
      const headers = callArgs[2]?.headers as Record<string, string>;

      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers).toHaveProperty('User-Agent', 'BCV-Service-Webhook/1.0');
      expect(headers).toHaveProperty('X-Webhook-Event');
      expect(headers).toHaveProperty('X-Webhook-Timestamp');
      expect(headers).toHaveProperty('X-Webhook-Attempt', '1');
    });

    it('should calculate percentage change correctly', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await webhookService.sendRateUpdateNotification(
        mockRateData,
        mockPreviousRate
      );

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1] as WebhookPayload;

      // (36.5 - 36.4) / 36.4 * 100 = 0.2747%
      const expectedChange = ((36.5 - 36.4) / 36.4) * 100;
      expect(payload.data.change.percentageChange).toBeCloseTo(
        expectedChange,
        4
      );
    });
  });

  describe('verifySignature', () => {
    it('should verify valid HMAC signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const crypto = require('node:crypto');
      const hmac = crypto.createHmac('sha256', 'test-secret-key');
      hmac.update(payload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = webhookService.verifySignature(payload, signature);
      expect(result).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const invalidSignature = 'sha256=invalid-signature-here';

      const result = webhookService.verifySignature(payload, invalidSignature);
      expect(result).toBe(false);
    });
  });
});
