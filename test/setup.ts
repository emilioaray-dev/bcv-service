/**
 * Setup file para Vitest
 * Este archivo se ejecuta antes de todos los tests
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock de variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'error'; // Solo errores en tests para no contaminar output
process.env.SAVE_TO_DATABASE = 'false'; // Evitar conexiones reales a MongoDB
process.env.BCV_WEBSITE_URL = 'https://www.bcv.org.ve/';
process.env.CRON_SCHEDULE = '0 0 * * *';

// Configuración global de tests
beforeAll(() => {
  // Setup global antes de todos los tests
  console.log('🧪 Iniciando suite de tests...');
});

afterAll(() => {
  // Cleanup global después de todos los tests
  console.log('✅ Tests completados');
});

beforeEach(() => {
  // Setup antes de cada test
  // Resetear todos los mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup después de cada test
  // Restaurar mocks
  vi.restoreAllMocks();
});

// Mock global del logger para evitar output en tests
vi.mock('../src/utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    http: vi.fn(),
    debug: vi.fn(),
  },
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    http: vi.fn(),
    debug: vi.fn(),
  },
}));
