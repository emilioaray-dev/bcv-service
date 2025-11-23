import { beforeEach, describe, expect, it } from 'vitest';

describe('Logger', () => {
  let log: any;

  beforeEach(async () => {
    // Import logger dynamically to get fresh instance
    const module = await import('@/utils/logger');
    log = module.default;
  });

  describe('logger initialization', () => {
    it('should create logger instance with all methods', () => {
      expect(log).toBeDefined();
      expect(log.error).toBeDefined();
      expect(log.warn).toBeDefined();
      expect(log.info).toBeDefined();
      expect(log.http).toBeDefined();
      expect(log.debug).toBeDefined();
      expect(typeof log.error).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.info).toBe('function');
      expect(typeof log.http).toBe('function');
      expect(typeof log.debug).toBe('function');
    });
  });

  describe('logging methods', () => {
    it('should have error method that accepts message and metadata', () => {
      expect(() => log.error('Test error')).not.toThrow();
      expect(() => log.error('Test error', { key: 'value' })).not.toThrow();
    });

    it('should have warn method that accepts message and metadata', () => {
      expect(() => log.warn('Test warning')).not.toThrow();
      expect(() => log.warn('Test warning', { key: 'value' })).not.toThrow();
    });

    it('should have info method that accepts message and metadata', () => {
      expect(() => log.info('Test info')).not.toThrow();
      expect(() => log.info('Test info', { key: 'value' })).not.toThrow();
    });

    it('should have http method that accepts message and metadata', () => {
      expect(() => log.http('Test http')).not.toThrow();
      expect(() => log.http('Test http', { key: 'value' })).not.toThrow();
    });

    it('should have debug method that accepts message and metadata', () => {
      expect(() => log.debug('Test debug')).not.toThrow();
      expect(() => log.debug('Test debug', { key: 'value' })).not.toThrow();
    });
  });

  describe('metadata handling', () => {
    it('should handle complex metadata objects', () => {
      const complexMeta = {
        user: { id: 123, name: 'Test User' },
        request: { method: 'POST', body: { data: 'test' } },
        timestamp: new Date().toISOString(),
      };

      expect(() =>
        log.info('Complex metadata test', complexMeta)
      ).not.toThrow();
    });

    it('should handle undefined metadata', () => {
      expect(() => log.info('Test message', undefined)).not.toThrow();
    });

    it('should handle empty metadata objects', () => {
      expect(() => log.info('Test message', {})).not.toThrow();
    });

    it('should handle null values in metadata', () => {
      expect(() => log.info('Test message', { value: null })).not.toThrow();
    });
  });

  describe('logger export', () => {
    it('should export log wrapper as default', async () => {
      const logWrapper = (await import('@/utils/logger')).default;
      expect(logWrapper).toBeDefined();
      expect(logWrapper.error).toBeDefined();
      expect(logWrapper.warn).toBeDefined();
      expect(logWrapper.info).toBeDefined();
      expect(logWrapper.http).toBeDefined();
      expect(logWrapper.debug).toBeDefined();
    });
  });
});
