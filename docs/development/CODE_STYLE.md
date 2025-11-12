# Code Style Guide

Guía de estilo de código para el proyecto BCV Service. Seguir estas convenciones asegura consistencia y calidad en el código.

## Tabla de Contenidos

1. [Herramientas](#herramientas)
2. [TypeScript Style](#typescript-style)
3. [Naming Conventions](#naming-conventions)
4. [File Organization](#file-organization)
5. [Code Patterns](#code-patterns)
6. [Comments and Documentation](#comments-and-documentation)
7. [Best Practices](#best-practices)

---

## Herramientas

### Biome

Usamos **Biome** para linting y formatting (NO ESLint/Prettier).

```bash
# Verificar código
pnpm run lint

# Formatear código
pnpm run format

# Verificar y aplicar fixes
pnpm run check
```

### Configuración

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExtraBooleanCast": "error",
        "noMultipleSpacesInRegularExpressionLiterals": "error",
        "noUselessCatch": "error",
        "noWith": "error"
      },
      "correctness": {
        "noConstAssign": "error",
        "noConstantCondition": "error",
        "noEmptyPattern": "error",
        "noGlobalObjectCalls": "error",
        "noInnerDeclarations": "error",
        "noInvalidConstructorSuper": "error",
        "noNewSymbol": "error",
        "noNonoctalDecimalEscape": "error",
        "noPrecisionLoss": "error",
        "noSelfAssign": "error",
        "noSetterReturn": "error",
        "noSwitchDeclarations": "error",
        "noUndeclaredVariables": "error",
        "noUnreachable": "error",
        "noUnreachableSuper": "error",
        "noUnsafeFinally": "error",
        "noUnsafeOptionalChaining": "error",
        "noUnusedLabels": "error",
        "noUnusedVariables": "error",
        "useIsNan": "error",
        "useValidForDirection": "error",
        "useYield": "error"
      },
      "style": {
        "noArguments": "error",
        "noVar": "error",
        "useConst": "error"
      },
      "suspicious": {
        "noAsyncPromiseExecutor": "error",
        "noCatchAssign": "error",
        "noClassAssign": "error",
        "noCompareNegZero": "error",
        "noControlCharactersInRegex": "error",
        "noDebugger": "error",
        "noDoubleEquals": "warn",
        "noDuplicateCase": "error",
        "noDuplicateClassMembers": "error",
        "noDuplicateObjectKeys": "error",
        "noDuplicateParameters": "error",
        "noEmptyBlockStatements": "error",
        "noExplicitAny": "warn",
        "noExtraNonNullAssertion": "error",
        "noFallthroughSwitchClause": "error",
        "noFunctionAssign": "error",
        "noGlobalAssign": "error",
        "noImportAssign": "error",
        "noMisleadingCharacterClass": "error",
        "noMisleadingInstantiator": "error",
        "noPrototypeBuiltins": "error",
        "noRedeclare": "error",
        "noShadowRestrictedNames": "error",
        "noUnsafeDeclarationMerging": "error",
        "noUnsafeNegation": "error",
        "useGetterReturn": "error",
        "useValidTypeof": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "none",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  }
}
```

---

## TypeScript Style

### Type Annotations

```typescript
// ✅ Good: Explicit types for function parameters and return values
function calculateRate(amount: number, rate: number): number {
  return amount * rate;
}

// ✅ Good: Type inference for obvious cases
const total = calculateRate(100, 36.5); // number inferred

// ❌ Bad: Missing type annotations
function calculateRate(amount, rate) {
  return amount * rate;
}
```

### Interfaces vs Types

**Prefer interfaces** for object shapes:

```typescript
// ✅ Good: Interface for object shape
interface RateData {
  date: Date;
  rates: CurrencyRate[];
  source: string;
}

// ✅ Good: Type for unions
type Status = 'pending' | 'success' | 'error';

// ✅ Good: Type for complex types
type Nullable<T> = T | null | undefined;
```

### Avoid `any`

```typescript
// ❌ Bad: Using any
function processData(data: any) {
  return data.value;
}

// ✅ Good: Use unknown and type guard
function processData(data: unknown): number {
  if (isRateData(data)) {
    return data.rates[0].value;
  }
  throw new Error('Invalid data');
}

function isRateData(data: unknown): data is RateData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'rates' in data &&
    Array.isArray((data as RateData).rates)
  );
}

// ✅ Good: Use generic when appropriate
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}
```

### Null Safety

```typescript
// ✅ Good: Use optional chaining
const rate = data?.rates?.[0]?.value;

// ✅ Good: Use nullish coalescing
const port = process.env.PORT ?? 3000;

// ✅ Good: Type guard for null checks
if (data !== null && data !== undefined) {
  processData(data);
}

// ❌ Bad: Non-null assertion (avoid unless absolutely necessary)
const value = data!.rates![0]!.value!;
```

---

## Naming Conventions

### Variables and Functions

```typescript
// ✅ Good: camelCase for variables and functions
const exchangeRate = 36.5;
const getCurrentRate = () => { /* ... */ };

// ❌ Bad: snake_case or PascalCase
const exchange_rate = 36.5;
const GetCurrentRate = () => { /* ... */ };
```

### Classes and Interfaces

```typescript
// ✅ Good: PascalCase for classes and interfaces
class BCVService { /* ... */ }
interface ICacheService { /* ... */ }

// Prefix interfaces with 'I'
interface ILogger { /* ... */ }

// ❌ Bad: camelCase or no prefix
class bcvService { /* ... */ }
interface CacheService { /* ... */ }
```

### Constants

```typescript
// ✅ Good: UPPER_SNAKE_CASE for constants
const MAX_RETRIES = 3;
const DEFAULT_PORT = 3000;
const API_BASE_URL = 'https://api.example.com';

// ❌ Bad: camelCase for true constants
const maxRetries = 3;
```

### Enums

```typescript
// ✅ Good: PascalCase for enum name, UPPER_CASE for values
enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Or use const object for better type inference
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];
```

### Private Members

```typescript
class MyService {
  // ✅ Good: Use TypeScript private keyword
  private apiKey: string;
  private logger: ILogger;

  // ✅ Good: Or use # for true private fields (ES2022)
  #cache: Map<string, any>;

  constructor() {
    this.apiKey = 'secret';
    this.#cache = new Map();
  }

  // ✅ Good: Private methods
  private validateInput(data: unknown): boolean {
    return true;
  }
}
```

### File Naming

```typescript
// ✅ Good: kebab-case for files
bcv.service.ts
mongo.service.ts
auth.middleware.ts
logger.ts
types.ts

// ✅ Good: Suffix for specific file types
bcv.service.ts       // Service
bcv.controller.ts    // Controller
bcv.interface.ts     // Interface definition
bcv.test.ts          // Test file
bcv.config.ts        // Configuration

// ❌ Bad: PascalCase or camelCase
BCVService.ts
bcvService.ts
```

---

## File Organization

### Import Order

```typescript
// 1. Node.js built-in modules
import http from 'http';
import path from 'path';

// 2. External dependencies
import express from 'express';
import { injectable, inject } from 'inversify';

// 3. Internal modules (with path alias)
import { TYPES } from '@/config/types';
import { config } from '@/config';
import type { ICacheService } from '@/services/cache.interface';
import log from '@/utils/logger';

// 4. Relative imports
import { MyHelper } from './helpers';
```

### Export Order

```typescript
// 1. Type exports
export type { RateData, CurrencyRate };
export interface IBCVService { /* ... */ }

// 2. Constant exports
export const MAX_RETRIES = 3;

// 3. Function exports
export function validateRate(rate: number): boolean { /* ... */ }

// 4. Class exports
export class BCVService implements IBCVService { /* ... */ }

// 5. Default export (if applicable)
export default BCVService;
```

### File Structure

```typescript
// 1. Imports
import { injectable } from 'inversify';

// 2. Types and interfaces
interface ServiceConfig {
  url: string;
  timeout: number;
}

// 3. Constants
const DEFAULT_TIMEOUT = 5000;

// 4. Class/function implementation
@injectable()
export class MyService {
  // Properties
  private config: ServiceConfig;

  // Constructor
  constructor(config: ServiceConfig) {
    this.config = config;
  }

  // Public methods
  public async fetchData(): Promise<Data> {
    return this.makeRequest();
  }

  // Private methods
  private async makeRequest(): Promise<Response> {
    // Implementation
  }
}

// 5. Helper functions (if any)
function parseData(raw: string): Data {
  // Implementation
}
```

---

## Code Patterns

### Dependency Injection

```typescript
// ✅ Good: Use Inversify for DI
import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';
import type { ILogger } from '@/interfaces/ILogger';

@injectable()
export class BCVService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.Config) private config: IConfig
  ) {}

  async getRates(): Promise<RateData> {
    this.logger.info('Fetching rates...');
    // Implementation
  }
}

// ❌ Bad: Hard-coded dependencies
export class BCVService {
  private logger = new Logger(); // Hard-coded!

  async getRates(): Promise<RateData> {
    this.logger.info('Fetching rates...');
    // Implementation
  }
}
```

### Error Handling

```typescript
// ✅ Good: Specific error classes
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NetworkError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ✅ Good: Try-catch with specific error handling
async function fetchData(): Promise<Data> {
  try {
    const response = await axios.get(url);
    return parseResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new NetworkError(
        `Failed to fetch data: ${error.message}`,
        error.response?.status ?? 500
      );
    }
    throw error;
  }
}

// ❌ Bad: Catching and ignoring errors
async function fetchData(): Promise<Data | null> {
  try {
    const response = await axios.get(url);
    return parseResponse(response.data);
  } catch (error) {
    return null; // Silent failure!
  }
}
```

### Async/Await

```typescript
// ✅ Good: Use async/await
async function processRates(): Promise<void> {
  const rates = await bcvService.getRates();
  await cacheService.saveRate(rates);
  await notifyClients(rates);
}

// ✅ Good: Handle errors properly
async function processRates(): Promise<void> {
  try {
    const rates = await bcvService.getRates();
    await cacheService.saveRate(rates);
  } catch (error) {
    log.error('Failed to process rates', { error });
    throw error;
  }
}

// ❌ Bad: Mixing promises and callbacks
function processRates(callback: (err: Error | null) => void): void {
  bcvService.getRates()
    .then((rates) => cacheService.saveRate(rates))
    .then(() => callback(null))
    .catch((err) => callback(err));
}
```

### Array Operations

```typescript
// ✅ Good: Use functional array methods
const usdRates = rates
  .filter((rate) => rate.currency === 'USD')
  .map((rate) => rate.value);

// ✅ Good: Use for...of for side effects
for (const rate of rates) {
  await processRate(rate);
}

// ❌ Bad: Mutation
const usdRates = [];
for (let i = 0; i < rates.length; i++) {
  if (rates[i].currency === 'USD') {
    usdRates.push(rates[i].value);
  }
}
```

---

## Comments and Documentation

### JSDoc Comments

```typescript
/**
 * Fetches exchange rates from BCV website
 *
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise resolving to rate data
 * @throws {NetworkError} If request fails after all retries
 * @throws {ValidationError} If response data is invalid
 *
 * @example
 * ```typescript
 * const rates = await bcvService.getRates();
 * console.log(rates.rates[0].value); // 36.5
 * ```
 */
async getRates(retries = 3): Promise<RateData> {
  // Implementation
}
```

### Inline Comments

```typescript
// ✅ Good: Explain WHY, not WHAT
// Retry 3 times because BCV website is unstable
const MAX_RETRIES = 3;

// Parse Spanish month names because BCV uses Spanish locale
const monthMap = {
  enero: 0,
  febrero: 1,
  // ...
};

// ❌ Bad: Stating the obvious
// Increment counter
counter++;

// Create new array
const arr = [];
```

### TODO Comments

```typescript
// ✅ Good: TODO with context and assignee
// TODO(celsius): Implement rate caching with Redis
// See issue #123 for requirements

// ❌ Bad: Vague TODO
// TODO: fix this
```

---

## Best Practices

### Immutability

```typescript
// ✅ Good: Use const by default
const rates = await getRates();

// ✅ Good: Avoid mutations
const updatedRates = rates.map((rate) => ({
  ...rate,
  value: rate.value * 1.1
}));

// ❌ Bad: Unnecessary mutations
let rates = await getRates();
rates.forEach((rate) => {
  rate.value = rate.value * 1.1; // Mutating!
});
```

### Function Length

```typescript
// ✅ Good: Small, focused functions
async function processRates(): Promise<void> {
  const rates = await fetchRates();
  const validRates = validateRates(rates);
  await saveRates(validRates);
  await notifyClients(validRates);
}

// ❌ Bad: Long function doing too much (100+ lines)
async function processRates(): Promise<void> {
  // Fetching logic (30 lines)
  // Validation logic (30 lines)
  // Saving logic (30 lines)
  // Notification logic (30 lines)
}
```

### Early Returns

```typescript
// ✅ Good: Early returns for validation
function processRate(rate: RateData | null): number {
  if (!rate) {
    return 0;
  }

  if (rate.rates.length === 0) {
    return 0;
  }

  return rate.rates[0].value;
}

// ❌ Bad: Deep nesting
function processRate(rate: RateData | null): number {
  if (rate) {
    if (rate.rates.length > 0) {
      return rate.rates[0].value;
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}
```

### Object Destructuring

```typescript
// ✅ Good: Destructure object properties
function processUser({ name, email, age }: User): void {
  console.log(`${name} (${email})`);
}

// ✅ Good: Destructure with defaults
function createConfig({
  port = 3000,
  host = 'localhost'
}: Partial<Config> = {}): Config {
  return { port, host };
}

// ❌ Bad: Repeated property access
function processUser(user: User): void {
  console.log(`${user.name} (${user.email})`);
  sendEmail(user.email);
  logActivity(user.name);
}
```

### String Templates

```typescript
// ✅ Good: Use template literals
const message = `User ${name} has ${count} items`;

// ❌ Bad: String concatenation
const message = 'User ' + name + ' has ' + count + ' items';
```

---

## Checklist

Antes de hacer commit, verifica:

- [ ] Código formateado con Biome (`pnpm run format`)
- [ ] Sin errores de lint (`pnpm run lint`)
- [ ] TypeScript compila sin errores (`pnpm run build`)
- [ ] Tests pasan (`pnpm test`)
- [ ] Naming conventions seguidas
- [ ] No hay `console.log` (usar logger)
- [ ] No hay `any` types innecesarios
- [ ] Comentarios JSDoc para APIs públicas
- [ ] Imports organizados correctamente
- [ ] Código sigue principios SOLID

---

## Referencias

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Biome Documentation](https://biomejs.dev/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
