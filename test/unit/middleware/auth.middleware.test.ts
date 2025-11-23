import { apiKeyAuth, optionalApiKeyAuth } from '@/middleware/auth.middleware';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock del config
vi.mock('@/config', () => ({
  config: {
    apiKeys: ['test-key-1', 'test-key-2'],
  },
}));

describe('auth.middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Setup de mocks antes de cada test
    mockRequest = {
      header: vi.fn(),
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('apiKeyAuth', () => {
    it('debe permitir acceso con API key válida', () => {
      // Arrange
      (mockRequest.header as Mock).mockReturnValue('test-key-1');

      // Act
      apiKeyAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('debe rechazar con 401 cuando falta el header X-API-Key', () => {
      // Arrange
      (mockRequest.header as Mock).mockReturnValue(undefined);

      // Act
      apiKeyAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message:
          'API key es requerida. Incluye el header X-API-Key en tu petición.',
        code: 'MISSING_API_KEY',
      });
    });

    it('debe rechazar con 403 cuando el API key es inválido', () => {
      // Arrange
      (mockRequest.header as Mock).mockReturnValue('invalid-key');

      // Act
      apiKeyAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'API key inválida.',
        code: 'INVALID_API_KEY',
      });
    });

    // Nota: El test de "modo desarrollo sin keys" requiere recargar el módulo
    // y es mejor testearlo con integración o manualmente en desarrollo
  });

  describe('optionalApiKeyAuth', () => {
    it('debe permitir acceso cuando no se proporciona API key', () => {
      // Arrange
      (mockRequest.header as Mock).mockReturnValue(undefined);

      // Act
      optionalApiKeyAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('debe permitir acceso con API key válida', () => {
      // Arrange
      (mockRequest.header as Mock).mockReturnValue('test-key-1');

      // Act
      optionalApiKeyAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('debe rechazar con 403 cuando el API key proporcionado es inválido', () => {
      // Arrange
      (mockRequest.header as Mock).mockReturnValue('invalid-key');

      // Act
      optionalApiKeyAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'API key inválida.',
        code: 'INVALID_API_KEY',
      });
    });
  });
});
