# Testing Guide

Guía completa de testing para BCV Service. Seguir estas prácticas asegura código confiable y mantenible.

## Tabla de Contenidos

1. [Testing Stack](#testing-stack)
2. [Running Tests](#running-tests)
3. [Writing Unit Tests](#writing-unit-tests)
4. [Mocking](#mocking)
5. [Coverage Requirements](#coverage-requirements)
6. [Testing Patterns](#testing-patterns)
7. [Best Practices](#best-practices)

---

## Testing Stack

### Herramientas

- **Vitest**: Test runner y framework (compatible con Jest API)
- **@vitest/ui**: UI para explorar tests
- **@vitest/coverage-v8**: Cobertura de código
- **chai**: Assertions (incluido en Vitest)

### ¿Por qué Vitest?

- ✅ 5-10x más rápido que Jest
- ✅ ESM nativo
- ✅ TypeScript de primera clase
- ✅ Watch mode inteligente
- ✅ API compatible con Jest
- ✅ Coverage nativo con v8

---

## Running Tests

### Comandos Básicos

```bash
# Ejecutar todos los tests
pnpm test

# Watch mode (re-ejecuta en cambios)
pnpm test:watch

# UI mode (interfaz visual)
pnpm test:ui

# Coverage report
pnpm run test:coverage

# Run specific file
pnpm test src/services/bcv.service.test.ts

# Run tests matching pattern
pnpm test -- bcv
```

### Configuración

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/types.ts',
        '**/interfaces/'
      ],
      thresholds: {
        lines: 50,
        functions: 45,
        branches: 50,
        statements: 50
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

---

## Writing Unit Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('BCVService', () => {
  // Setup
  let service: BCVService;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Arrange: Setup before each test
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };
    service = new BCVService(mockLogger);
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  describe('getRates', () => {
    it('should fetch rates successfully', async () => {
      // Arrange
      const mockResponse = {
        data: '<html>...</html>'
      };
      vi.spyOn(axios, 'get').mockResolvedValue(mockResponse);

      // Act
      const result = await service.getRates();

      // Assert
      expect(result).toBeDefined();
      expect(result.rates).toHaveLength(2);
      expect(result.rates[0].currency).toBe('USD');
    });

    it('should retry on failure', async () => {
      // Arrange
      vi.spyOn(axios, 'get')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: '<html>...</html>' });

      // Act
      const result = await service.getRates();

      // Assert
      expect(axios.get).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });

    it('should throw error after max retries', async () => {
      // Arrange
      vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.getRates()).rejects.toThrow('Network error');
      expect(axios.get).toHaveBeenCalledTimes(3);
    });
  });
});
```

### AAA Pattern

Organizar tests con patrón **Arrange-Act-Assert**:

```typescript
it('should calculate total correctly', () => {
  // Arrange: Setup data and mocks
  const price = 100;
  const quantity = 2;

  // Act: Execute the function
  const total = calculateTotal(price, quantity);

  // Assert: Verify results
  expect(total).toBe(200);
});
```

### Test Naming

```typescript
// ✅ Good: Descriptive test names
describe('BCVService', () => {
  describe('getRates', () => {
    it('should return array of currency rates', async () => { /* ... */ });
    it('should retry 3 times on network error', async () => { /* ... */ });
    it('should throw ValidationError on invalid HTML', async () => { /* ... */ });
    it('should parse Spanish date format correctly', async () => { /* ... */ });
  });
});

// ❌ Bad: Vague test names
it('works', () => { /* ... */ });
it('test 1', () => { /* ... */ });
it('should do something', () => { /* ... */ });
```

---

## Mocking

### Mock Functions

```typescript
import { vi } from 'vitest';

// Create mock function
const mockFn = vi.fn();

// Mock with return value
const mockFn = vi.fn().mockReturnValue(42);

// Mock with implementation
const mockFn = vi.fn((x) => x * 2);

// Mock with resolved promise
const mockFn = vi.fn().mockResolvedValue({ data: 'success' });

// Mock with rejected promise
const mockFn = vi.fn().mockRejectedValue(new Error('Failed'));

// Assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith(42);
expect(mockFn).toHaveBeenLastCalledWith(100);
```

### Spy on Methods

```typescript
import { vi } from 'vitest';
import axios from 'axios';

// Spy on existing method
const spy = vi.spyOn(axios, 'get');

// Mock implementation
spy.mockImplementation(async () => ({ data: 'mocked' }));

// Or mock return value
spy.mockResolvedValue({ data: 'mocked' });

// Restore original implementation
spy.mockRestore();

// Use in test
it('should call axios.get', async () => {
  const spy = vi.spyOn(axios, 'get').mockResolvedValue({ data: 'ok' });

  await service.fetchData();

  expect(spy).toHaveBeenCalledWith('https://api.example.com');

  spy.mockRestore();
});
```

### Mock Modules

```typescript
// Mock entire module
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Partial mock (keep some real implementations)
vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual('@/utils/logger');
  return {
    ...actual,
    error: vi.fn() // Only mock error
  };
});

// Mock with factory
vi.mock('@/config', () => ({
  config: {
    port: 3000,
    nodeEnv: 'test',
    mongodbUri: 'mongodb://localhost:27017/test'
  }
}));
```

### Mock Interfaces

```typescript
// Create mock implementation of interface
const mockLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  http: vi.fn()
};

// Use in service
const service = new BCVService(mockLogger);

// Verify calls
expect(mockLogger.info).toHaveBeenCalledWith('Fetching rates...');
```

---

## Coverage Requirements

### Thresholds

| Metric | Minimum | Target |
|--------|---------|--------|
| Lines | 50% | 70%+ |
| Functions | 45% | 65%+ |
| Branches | 50% | 70%+ |
| Statements | 50% | 70%+ |

### Check Coverage

```bash
# Generate coverage report
pnpm run test:coverage

# View HTML report
open coverage/index.html

# Coverage summary in terminal
pnpm test -- --coverage
```

### Coverage Reports

```
------------------------|---------|----------|---------|---------|
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
All files               |   66.26 |    65.51 |   48.38 |   66.04 |
 services               |   82.35 |    75.00 |   60.00 |   82.14 |
  bcv.service.ts        |   98.75 |    88.88 |   85.71 |   98.68 |
  mongo.service.ts      |   75.00 |    66.66 |   50.00 |   75.00 |
 middleware             |   86.95 |    75.00 |   66.66 |   86.95 |
  auth.middleware.ts    |   86.95 |    75.00 |   66.66 |   86.95 |
 utils                  |   90.00 |    83.33 |   70.00 |   90.00 |
  logger.ts             |   90.00 |    83.33 |   70.00 |   90.00 |
------------------------|---------|----------|---------|---------|
```

### What to Test

✅ **Do Test**:
- Business logic
- Data transformations
- Error handling
- Edge cases
- Validation logic
- Public APIs

❌ **Don't Test**:
- Third-party libraries
- TypeScript type definitions
- Simple getters/setters
- Configuration files
- Trivial code

---

## Testing Patterns

### Test Data Builders

```typescript
// Create builder for test data
class RateDataBuilder {
  private data: RateData = {
    date: new Date(),
    rates: [],
    source: 'bcv.org.ve',
    scrapedAt: new Date()
  };

  withDate(date: Date): this {
    this.data.date = date;
    return this;
  }

  withRate(currency: string, value: number): this {
    this.data.rates.push({ currency, value });
    return this;
  }

  build(): RateData {
    return this.data;
  }
}

// Use in tests
it('should process rate data', () => {
  const rateData = new RateDataBuilder()
    .withDate(new Date('2025-01-12'))
    .withRate('USD', 36.5)
    .withRate('EUR', 38.2)
    .build();

  const result = processRates(rateData);

  expect(result).toBeDefined();
});
```

### Parameterized Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('validateRate', () => {
  const testCases = [
    { input: 36.5, expected: true },
    { input: 0, expected: false },
    { input: -1, expected: false },
    { input: null, expected: false },
    { input: undefined, expected: false }
  ];

  testCases.forEach(({ input, expected }) => {
    it(`should return ${expected} for ${input}`, () => {
      expect(validateRate(input)).toBe(expected);
    });
  });
});

// Or use it.each
it.each([
  [36.5, true],
  [0, false],
  [-1, false]
])('validateRate(%s) should be %s', (input, expected) => {
  expect(validateRate(input)).toBe(expected);
});
```

### Async Testing

```typescript
describe('async operations', () => {
  // ✅ Good: async/await
  it('should fetch data', async () => {
    const data = await service.getData();
    expect(data).toBeDefined();
  });

  // ✅ Good: Return promise
  it('should fetch data', () => {
    return service.getData().then((data) => {
      expect(data).toBeDefined();
    });
  });

  // ✅ Good: Test rejection
  it('should throw error', async () => {
    await expect(service.getData()).rejects.toThrow('Not found');
  });

  // ❌ Bad: No await (test will pass even if it should fail)
  it('should fetch data', () => {
    service.getData(); // Missing await!
    expect(true).toBe(true);
  });
});
```

### Testing Timers

```typescript
import { vi } from 'vitest';

describe('scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute after delay', () => {
    const callback = vi.fn();

    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should execute interval', () => {
    const callback = vi.fn();

    setInterval(callback, 1000);

    vi.advanceTimersByTime(3000);

    expect(callback).toHaveBeenCalledTimes(3);
  });
});
```

---

## Best Practices

### 1. Test Independence

```typescript
// ✅ Good: Each test is independent
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(); // Fresh instance
  });

  it('should create user', () => {
    service.createUser({ name: 'Alice' });
    expect(service.getUsers()).toHaveLength(1);
  });

  it('should delete user', () => {
    service.createUser({ name: 'Bob' });
    service.deleteUser('Bob');
    expect(service.getUsers()).toHaveLength(0);
  });
});

// ❌ Bad: Tests depend on each other
describe('UserService', () => {
  const service = new UserService(); // Shared instance!

  it('should create user', () => {
    service.createUser({ name: 'Alice' });
    expect(service.getUsers()).toHaveLength(1);
  });

  it('should have 1 user', () => {
    // Depends on previous test!
    expect(service.getUsers()).toHaveLength(1);
  });
});
```

### 2. Test One Thing

```typescript
// ✅ Good: Test one behavior
it('should validate email format', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
});

it('should reject invalid email', () => {
  expect(isValidEmail('invalid')).toBe(false);
});

// ❌ Bad: Testing multiple things
it('should validate email and password', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
  expect(isValidPassword('password123')).toBe(true);
  expect(createUser({ email: 'test@example.com', password: 'password123' })).toBeDefined();
});
```

### 3. Clear Assertions

```typescript
// ✅ Good: Specific assertions
it('should return user object', () => {
  const user = getUser('alice');

  expect(user).toBeDefined();
  expect(user.name).toBe('Alice');
  expect(user.email).toBe('alice@example.com');
  expect(user.age).toBe(25);
});

// ❌ Bad: Vague assertion
it('should work', () => {
  const result = doSomething();
  expect(result).toBeTruthy(); // What does this test?
});
```

### 4. Test Error Cases

```typescript
describe('divide', () => {
  it('should divide numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  // ✅ Good: Test error cases
  it('should throw on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });

  it('should throw on invalid input', () => {
    expect(() => divide('10' as any, 2)).toThrow('Invalid input');
  });
});
```

### 5. Avoid Test Logic

```typescript
// ✅ Good: Direct assertions
it('should return even numbers', () => {
  const result = getEvenNumbers([1, 2, 3, 4, 5]);
  expect(result).toEqual([2, 4]);
});

// ❌ Bad: Logic in test
it('should return even numbers', () => {
  const result = getEvenNumbers([1, 2, 3, 4, 5]);
  const expected = [];
  for (let i = 1; i <= 5; i++) {
    if (i % 2 === 0) {
      expected.push(i);
    }
  }
  expect(result).toEqual(expected);
});
```

---

## Examples

### Service Test

```typescript
// test/unit/services/bcv.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BCVService } from '@/services/bcv.service';
import axios from 'axios';

vi.mock('axios');

describe('BCVService', () => {
  let service: BCVService;
  const mockHtml = `
    <div id="dolar">
      <strong>12/01/2025</strong>
      <span>36,50</span>
    </div>
  `;

  beforeEach(() => {
    service = new BCVService();
  });

  describe('getRates', () => {
    it('should parse HTML and return rates', async () => {
      vi.spyOn(axios, 'get').mockResolvedValue({ data: mockHtml });

      const result = await service.getRates();

      expect(result).toBeDefined();
      expect(result.rates).toHaveLength(1);
      expect(result.rates[0]).toEqual({
        currency: 'USD',
        value: 36.5
      });
    });

    it('should handle network errors', async () => {
      vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));

      await expect(service.getRates()).rejects.toThrow('Network error');
    });
  });
});
```

### Middleware Test

```typescript
// test/unit/middleware/auth.middleware.test.ts
import { describe, it, expect, vi } from 'vitest';
import { apiKeyAuth } from '@/middleware/auth.middleware';
import type { Request, Response, NextFunction } from 'express';

describe('apiKeyAuth', () => {
  it('should allow request with valid API key', () => {
    const req = {
      headers: { 'x-api-key': 'valid-key' }
    } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    process.env.API_KEYS = '["valid-key"]';

    apiKeyAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should reject request with invalid API key', () => {
    const req = {
      headers: { 'x-api-key': 'invalid-key' }
    } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    process.env.API_KEYS = '["valid-key"]';

    apiKeyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

---

## Checklist

Antes de hacer commit:

- [ ] Todos los tests pasan (`pnpm test`)
- [ ] Coverage cumple thresholds (`pnpm run test:coverage`)
- [ ] Nuevas features tienen tests
- [ ] Bug fixes tienen regression tests
- [ ] Tests son independientes
- [ ] Tests tienen nombres descriptivos
- [ ] Mocks están correctamente configurados
- [ ] No hay tests skipped (`it.skip`) sin razón

---

## Referencias

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Test Desiderata](https://kentbeck.github.io/TestDesiderata/)
- [Martin Fowler: Testing](https://martinfowler.com/testing/)
