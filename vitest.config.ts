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
      ],
      // Thresholds de coverage
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
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
