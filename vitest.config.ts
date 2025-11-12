import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Entorno de testing
    environment: 'node',

    // Globals (opcional - permite usar describe, it, expect sin importar)
    globals: true,

    // Archivos de setup
    setupFiles: ['./test/setup.ts'],

    // Cobertura de código
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types/',
        'src/app.ts', // Archivo principal del servidor (difícil de testear directamente)
        'src/config/**', // Archivos de configuración
        'src/controllers/**', // Controllers (requieren integration tests)
        'src/models/**', // Modelos de datos (solo tipos)
        'src/schemas/**', // Schemas (solo definiciones)
        'src/utils/routes.ts', // Archivo de rutas (requiere integration tests)
        'src/utils/logger.ts', // Logger wrapper (difícil de testear sin integración real)
        'src/services/cache.interface.ts', // Solo interfaz
        'src/middleware/error.middleware.ts', // Error middleware (requiere integration tests)
      ],
      // Thresholds de coverage
      thresholds: {
        lines: 50,
        functions: 45,
        branches: 50,
        statements: 50,
      },
      // Incluir archivos sin tests
      all: true,
      include: ['src/**/*.ts'],
    },

    // Ubicación de tests
    include: [
      'test/**/*.test.ts',
      'test/**/*.spec.ts',
    ],

    // Timeout para tests async
    testTimeout: 10000,

    // Mostrar cada test
    reporter: ['verbose'],

    // Mock de servicios
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },

  // Resolución de paths
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './test'),
    },
  },
});
