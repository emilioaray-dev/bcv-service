# Guía de Estilo de Código

Guía de estilo de código para el proyecto BCV Service. Seguir estas convenciones asegura consistencia, calidad y mantenibilidad del código.

## Tabla de Contenidos

1. [Herramientas](#herramientas)
2. [Estilo TypeScript](#estilo-typescript)
3. [Convenciones de Nomenclatura](#convenciones-de-nomenclatura)
4. [Organización de Archivos](#organización-de-archivos)
5. [Patrones de Código](#patrones-de-código)
6. [Comentarios y Documentación](#comentarios-y-documentación)
7. [Prácticas Recomendadas](#prácticas-recomendadas)
8. [Integración con Inversify](#integración-con-inversify)
9. [SOLID Principles](#solid-principles)

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

### Configuración de Biome

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
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
    "lineWidth": 120,
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

## Estilo TypeScript

### Anotaciones de Tipos

```typescript
// ✅ Bien: Tipos explícitos para parámetros y valores de retorno
function calculateRate(amount: number, rate: number): number {
  return amount * rate;
}

// ✅ Bien: Inferencia de tipos para casos obvios
const total = calculateRate(100, 36.5); // number inferido

// ❌ Mal: Sin anotaciones de tipo
function calculateRate(amount, rate) {
  return amount * rate;
}
```

### Interfaces vs Types

**Preferir interfaces** para formas de objeto:

```typescript
// ✅ Bien: Interface para forma de objeto
interface RateData {
  date: Date;
  rates: CurrencyRate[];
  source: string;
}

// ✅ Bien: Type para uniones
type Status = 'pending' | 'success' | 'error';

// ✅ Bien: Type para tipos complejos
type Nullable<T> = T | null | undefined;

// ✅ Bien: Interface herencia para extensibilidad
interface BaseRate {
  date: string;
  createdAt: Date;
}

interface FullRate extends BaseRate {
  rates: CurrencyRate[];
  source: 'bcv';
}
```

### Evitar `any`

```typescript
// ❌ Mal: Usando any
function processData(data: any) {
  return data.value;
}

// ✅ Bien: Usar unknown y type guard
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

// ✅ Bien: Usar genéricos cuando sea apropiado
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}
```

### Seguridad de Nulos

```typescript
// ✅ Bien: Usar optional chaining
const rate = data?.rates?.[0]?.value;

// ✅ Bien: Usar nullish coalescing
const port = process.env.PORT ?? 3000;

// ✅ Bien: Type guard para chequeos de nulos
if (data !== null && data !== undefined) {
  processData(data);
}

// ❌ Mal: Non-null assertion (evitar a menos que sea absolutamente necesario)
const value = data!.rates![0]!.value!;
```

---

## Convenciones de Nomenclatura

### Variables y Funciones

```typescript
// ✅ Bien: camelCase para variables y funciones
const exchangeRate = 36.5;
const getCurrentRate = () => { /* ... */ };

// ❌ Mal: snake_case o PascalCase
const exchange_rate = 36.5;
const GetCurrentRate = () => { /* ... */ };
```

### Clases e Interfaces

```typescript
// ✅ Bien: PascalCase para clases e interfaces
class BCVService { /* ... */ }
interface IRateService { /* ... */ }

// ✅ Bien: Prefijo 'I' para interfaces (opcional, dependiendo de la preferencia del equipo)
interface ILogger { /* ... */ }

// ✅ Bien: Prefijo 'Abstract' para clases abstractas
abstract class AbstractNotificationService { /* ... */ }

// ❌ Mal: camelCase o sin prefijo
class bcvService { /* ... */ }
interface RateService { /* ... */ }
```

### Constantes

```typescript
// ✅ Bien: UPPER_SNAKE_CASE para constantes
const MAX_RETRIES = 3;
const DEFAULT_PORT = 3000;
const API_BASE_URL = 'https://api.example.com';

// ❌ Mal: camelCase para verdaderas constantes
const maxRetries = 3;
```

### Enums

```typescript
// ✅ Bien: PascalCase para el nombre del enum, UPPER_CASE para valores
enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// O usar objeto const para mejor inferencia de tipos
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];
```

### Miembros Privados

```typescript
class MyService {
  // ✅ Bien: Usar palabra clave private de TypeScript
  private apiKey: string;
  private logger: ILogger;

  // ✅ Bien: O usar # para campos verdaderamente privados (ES2022)
  #cache: Map<string, any>;

  constructor() {
    this.apiKey = 'secret';
    this.#cache = new Map();
  }

  // ✅ Bien: Métodos privados
  private validateInput(data: unknown): boolean {
    return true;
  }
}
```

### Archivo de Nombres

```typescript
// ✅ Bien: kebab-case para archivos
bcv.service.ts
mongo.service.ts
auth.middleware.ts
logger.ts
types.ts

// ✅ Bien: Sufijos para tipos específicos de archivo
bcv.service.ts       // Servicio
bcv.controller.ts    // Controlador
bcv.interface.ts     // Definición de interfaz
bcv.test.ts          // Archivo de test
bcv.config.ts        // Configuración
bcv.dto.ts           // DTO/Model
bcv.schema.ts        // Esquema de validación (Zod)
```

---

## Organización de Archivos

### Orden de Importaciones

```typescript
// 1. Node.js built-in modules
import http from 'http';
import path from 'path';
import { createHash } from 'crypto';

// 2. External dependencies
import express from 'express';
import { injectable, inject } from 'inversify';
import { z } from 'zod';
import { Counter, Gauge, Histogram } from 'prom-client';

// 3. Internal modules (with path alias)
import { TYPES } from '@/config/types';
import { config } from '@/config';
import type { IBCVService } from '@/interfaces/IBCVService';
import type { ICacheService } from '@/interfaces/ICacheService';
import type { INotificationStateService } from '@/interfaces/INotificationStateService';
import log from '@/utils/logger';

// 4. Importaciones relativas específicas
import { parseDateString } from '@/utils/date-parser';
import { createRateUpdateEvent } from '@/utils/events';
```

### Orden de Exportaciones

```typescript
// 1. Exportaciones de tipo
export type { RateData, CurrencyRate, RateUpdateEvent };
export interface IBCVService { /* ... */ }

// 2. Exportaciones de constantes
export const MAX_RETRIES = 3;
export const CHANGE_THRESHOLD = 0.01;

// 3. Exportaciones de funciones
export function validateRate(rate: number): boolean {
  /* ... */
}

// 4. Exportaciones de clase
export class BCVService implements IBCVService {
  /* ... */
}

// 5. Exportación por defecto (si aplica)
export default BCVService;
```

### Estructura de Archivo

```typescript
// 1. Imports
import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';
import type { IBCVService } from '@/interfaces/IBCVService';
import log from '@/utils/logger';

// 2. Tipos e interfaces
interface ServiceConfig {
  url: string;
  timeout: number;
  maxRetries: number;
}

// 3. Constantes
const DEFAULT_TIMEOUT = 5000;

// 4. Implementación de clase con Inversify
@injectable()
export class BCVService implements IBCVService {
  // 5. Propiedades con inyección de dependencias
  private config: ServiceConfig;

  constructor(
    @inject(TYPES.Config) config: ServiceConfig,
    @inject(TYPES.Logger) private logger: typeof log,
    @inject(TYPES.NotificationStateService) 
    private notificationStateService: INotificationStateService
  ) {
    this.config = config;
  }

  // 6. Métodos públicos
  public async getRates(): Promise<RateData> {
    this.logger.info('Obteniendo tasas del BCV...', {
      timestamp: new Date().toISOString()
    });
    return this.fetchRateData();
  }

  // 7. Métodos privados
  private async fetchRateData(): Promise<RateData> {
    // Implementación
  }
}

// 8. Funciones auxiliares (si las hay)
function parseRateData(html: string): RateData {
  // Implementación
}
```

---

## Patrones de Código

### Inyección de Dependencias con Inversify

```typescript
// ✅ Bien: Usar Inversify para DI
import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';
import type { ILogger } from '@/interfaces/ILogger';
import type { ICacheService } from '@/interfaces/ICacheService';
import type { IWebSocketService } from '@/interfaces/IWebSocketService';
import type { INotificationStateService } from '@/interfaces/INotificationStateService';

@injectable()
export class BCVService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.WebSocketService) private webSocketService: IWebSocketService,
    @inject(TYPES.NotificationStateService) 
    private notificationStateService: INotificationStateService
  ) {}

  async getRates(): Promise<RateData> {
    this.logger.info('Obteniendo tasas del BCV...');
    // Implementación
  }
}

// ❌ Mal: Dependencias hard-coded
export class BCVService {
  private logger = new Logger(); // ¡Hard-coded!
  private cacheService = new MongoService(); // ¡Hard-coded!

  async getRates(): Promise<RateData> {
    this.logger.info('Obteniendo tasas del BCV...');
    // Implementación
  }
}
```

### Manejo de Errores

```typescript
// ✅ Bien: Clases de error específicas
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

// ✅ Bien: Try-catch con manejo específico de errores
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

// ❌ Mal: Catching y ignorando errores
async function fetchData(): Promise<Data | null> {
  try {
    const response = await axios.get(url);
    return parseResponse(response.data);
  } catch (error) {
    return null; // ¡Falla silenciosa!
  }
}
```

### Async/Await

```typescript
// ✅ Bien: Usar async/await
async function processRates(): Promise<void> {
  const rates = await bcvService.getRates();
  await cacheService.saveRate(rates);
  await notifyClients(rates);
}

// ✅ Bien: Manejar errores adecuadamente
async function processRates(): Promise<void> {
  try {
    const rates = await bcvService.getRates();
    const hasSignificantChange = 
      await notificationStateService.hasSignificantChangeAndNotify(rates);
    
    if (hasSignificantChange) {
      await webSocketService.broadcastRateUpdate(rates);
      await discordService.sendRateUpdateNotification(rates);
      await webhookService.sendRateUpdateNotification(rates);
    }
  } catch (error) {
    log.error('Failed to process rates', { error });
    throw error;
  }
}

// ❌ Mal: Mezcla de promesas y callbacks
function processRates(callback: (err: Error | null) => void): void {
  bcvService.getRates()
    .then((rates) => cacheService.saveRate(rates))
    .then(() => callback(null))
    .catch((err) => callback(err));
}
```

### Operaciones con Arrays

```typescript
// ✅ Bien: Usar métodos funcionales de arrays
const usdRates = rates
  .filter((rate) => rate.currency === 'USD')
  .map((rate) => rate.rate);

// ✅ Bien: Usar for...of para efectos secundarios
for (const rate of rates) {
  await processRate(rate);
}

// ❌ Mal: Mutación
const usdRates = [];
for (let i = 0; i < rates.length; i++) {
  if (rates[i].currency === 'USD') {
    usdRates.push(rates[i].rate);
  }
}
```

---

## Comentarios y Documentación

### Comentarios JSDoc

```typescript
/**
 * Obtiene las tasas de cambio del BCV con validación de estado persistente
 *
 * Implementa sistema de estado persistente dual-layer (MongoDB primario + Redis cache)
 * para prevenir notificaciones duplicadas al reiniciar el servicio. Solo notifica
 * cambios significativos (umbral absoluto ≥0.01) en cualquier moneda.
 *
 * @param retries - Número de reintentos (predeterminado: 3)
 * @returns Promise resolviéndose en datos de tasa (null si falla completamente después de reintentos)
 * @throws {NetworkError} Si falla la conexión después de todos los reintentos
 * @throws {ValidationError} Si los datos de respuesta no son válidos
 *
 * @example
 * ```typescript
 * const rates = await bcvService.getRates();
 * if (rates) {
 *   console.log(rates.rates[0].rate); // 36.5
 * }
 * ```
 */
async getRates(retries = 3): Promise<RateData | null> {
  // Implementation
}
```

### Comentarios en Línea

```typescript
// ✅ Bien: Explicar POR QUÉ, no QUÉ
// Retry 3 times because BCV website is unstable and has SSL certificate issues
const MAX_RETRIES = 3;

// Parse Spanish month names because BCV uses Spanish locale
const monthMap = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  // ...
};

// Use dual-layer notification state system to prevent duplicates on restart
const hasSignificantChange = 
  await this.notificationStateService.hasSignificantChangeAndNotify(rateData);

// ❌ Mal: Indicar lo obvio
// Increment counter
counter++;

// Create new array
const arr = [];
```

### Comentarios TODO

```typescript
// ✅ Bien: TODO con contexto y asignado
// TODO(celsius): Implement Redis cache for notification state (currently using MongoDB only)
// See issue #123 for requirements and performance benchmarks

// ❌ Mal: TODO vago
// TODO: fix this
```

---

## Prácticas Recomendadas

### Inmutabilidad

```typescript
// ✅ Bien: Usar const por defecto
const rates = await getRates();

// ✅ Bien: Evitar mutaciones
const updatedRates = rates.map((rate) => ({
  ...rate,
  rate: rate.rate * 1.1
}));

// ❌ Mal: Mutaciones innecesarias
let rates = await getRates();
rates.forEach((rate) => {
  rate.rate = rate.rate * 1.1; // ¡Mutando!
});
```

### Longitud de Funciones

```typescript
// ✅ Bien: Funciones pequeñas y enfocadas
async function processRates(): Promise<void> {
  const rates = await fetchRates();
  const validRates = validateRates(rates);
  await saveRates(validRates);
  await broadcastRateUpdate(validRates);
}

// ❌ Mal: Función larga haciendo demasiado (100+ líneas)
async function processRates(): Promise<void> {
  // Lógica de fetching (30 líneas)
  // Lógica de validación (30 líneas)
  // Lógica de guardado (30 líneas)
  // Lógica de notificación (30 líneas)
}
```

### Devoluciones Tempranas

```typescript
// ✅ Bien: Devoluciones tempranas para validación
async function hasSignificantChange(
  previousRate: RateData | null, 
  currentRate: RateData
): Promise<boolean> {
  if (!previousRate) {
    return true; // Always notify first time
  }

  const hasChange = this.calculateChange(previousRate, currentRate);
  return Math.abs(hasChange) >= 0.01; // Threshold check
}

// ❌ Mal: Anidación profunda
async function hasSignificantChange(
  previousRate: RateData | null, 
  currentRate: RateData
): Promise<boolean> {
  if (previousRate) {
    const change = this.calculateChange(previousRate, currentRate);
    if (Math.abs(change) >= 0.01) {
      return true;
    } else {
      return false;
    }
  } else {
    return true;
  }
}
```

### Desestructuración de Objetos

```typescript
// ✅ Bien: Desestructurar propiedades de objeto
function processRate({ date, rates, source }: RateData): void {
  console.log(`${date} - ${source}`);
}

// ✅ Bien: Desestructurar con valores predeterminados
function createConfig({
  port = 3000,
  host = 'localhost'
}: Partial<Config> = {}): Config {
  return { port, host };
}

// ❌ Mal: Acceso repetido a propiedades
function processRate(rate: RateData): void {
  console.log(`${rate.date} - ${rate.source}`);
  sendNotification(rate.date);
  logActivity(rate.source);
}
```

### Cadenas de Texto

```typescript
// ✅ Bien: Usar literales de plantilla
const message = `Usuario ${name} tiene ${count} tasas`;

// ❌ Mal: Concatenación de cadenas
const message = 'Usuario ' + name + ' tiene ' + count + ' tasas';
```

---

## Integración con Inversify

### Uso Correcto de Decoradores

```typescript
// ✅ Bien: Uso de @injectable y @inject para DI
import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';

@injectable()
export class NotificationStateService {
  constructor(
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.RedisService) private redisService: IRedisService
  ) {}

  async hasSignificantChangeAndNotify(rateData: RateData): Promise<boolean> {
    // Leer desde Redis cache o fallback a MongoDB
    const lastState = await this.getLastNotificationStateFromDualLayer();
    const hasChange = this.hasSignificantChange(lastState?.lastNotifiedRate, rateData);
    
    if (hasChange) {
      await this.saveStateToDualLayer({
        lastNotifiedRate: rateData,
        lastNotificationDate: new Date().toISOString()
      });
    }
    
    return hasChange;
  }
}
```

### Configuración del Contenedor

```typescript
// ✅ Bien: Configuración del contenedor IoC
import { Container } from 'inversify';
import { BCVService } from '@/services/bcv.service';
import { IBCVService } from '@/interfaces/IBCVService';
import { TYPES } from '@/config/types';

export function createContainer(): Container {
  const container = new Container();

  // Servicios singleton
  container.bind<IBCVService>(TYPES.BCVService).to(BCVService).inSingletonScope();
  container.bind<ICacheService>(TYPES.CacheService).to(MongoService).inSingletonScope();
  container.bind<INotificationStateService>(TYPES.NotificationStateService)
    .to(NotificationStateService).inSingletonScope();

  return container;
}
```

### Interfaces de Servicio

```typescript
// ✅ Bien: Definición clara de interfaces para DI
export interface IBCVService {
  getRates(retries?: number): Promise<RateData | null>;
  getCurrentRate(): Promise<RateData | null>;
}

export interface INotificationStateService {
  hasSignificantChangeAndNotify(rateData: RateData): Promise<boolean>;
  getLastNotificationState(): Promise<NotificationState | null>;
  saveNotificationState(state: NotificationState): Promise<void>;
}
```

---

## SOLID Principles

### Single Responsibility Principle (SRP)

```typescript
// ✅ Bien: Cada clase tiene una única responsabilidad
@injectable()
export class BCVService implements IBCVService {
  // Responsabilidad única: Web scraping del BCV
  async getRates(): Promise<RateData | null> {
    // Solo scraping y parsing
  }
}

@injectable()
export class NotificationStateService implements INotificationStateService {
  // Responsabilidad única: Gestión del estado persistente de notificaciones
  async hasSignificantChangeAndNotify(rateData: RateData): Promise<boolean> {
    // Solo comparación y guardado de estado
  }
}

@injectable()
export class DiscordService {
  // Responsabilidad única: Notificaciones a Discord
  async sendRateUpdateNotification(rateData: RateData): Promise<void> {
    // Solo envío a Discord
  }
}
```

### Open/Closed Principle (OCP)

```typescript
// ✅ Bien: Abierto a extensión, cerrado a modificación
export interface INotificationService {
  sendNotification(event: NotificationEvent): Promise<void>;
}

@injectable()
export class DiscordNotificationService implements INotificationService {
  async sendNotification(event: NotificationEvent): Promise<void> {
    // Implementación específica para Discord
  }
}

@injectable()
export class WebhookNotificationService implements INotificationService {
  async sendNotification(event: NotificationEvent): Promise<void> {
    // Implementación específica para Webhook HTTP
  }
}

// El sistema puede aceptar nuevos servicios de notificación sin modificar código existente
```

### Liskov Substitution Principle (LSP)

```typescript
// ✅ Bien: Implementaciones sustituibles
export abstract class BaseNotificationService implements INotificationService {
  abstract sendNotification(event: NotificationEvent): Promise<void>;
}

export class DiscordNotificationService extends BaseNotificationService {
  async sendNotification(event: NotificationEvent): Promise<void> {
    // Cumple con el contrato de la clase base
    await this.sendToDiscord(event);
  }
}

export class WebhookNotificationService extends BaseNotificationService {
  async sendNotification(event: NotificationEvent): Promise<void> {
    // Cumple con el contrato de la clase base
    await this.sendToWebhook(event);
  }
}
```

### Interface Segregation Principle (ISP)

```typescript
// ✅ Bien: Interfaces específicas y pequeñas
export interface IBroadcastService {
  broadcastRateUpdate(rateData: RateData): void;
  getConnectedClientsCount(): number;
}

export interface IDataService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  saveRate(rateData: RateData): Promise<void>;
  getLatestRate(): Promise<RateData | null>;
}

export interface INotificationStateService {
  hasSignificantChangeAndNotify(rateData: RateData): Promise<boolean>;
  getLastNotificationState(): Promise<NotificationState | null>;
  saveNotificationState(state: NotificationState): Promise<void>;
}
```

### Dependency Inversion Principle (DIP)

```typescript
// ✅ Bien: Dependencias de abstracciones, no de concreciones
@injectable()
export class BCVService {
  constructor(
    @inject(TYPES.NotificationStateService) 
    private notificationStateService: INotificationStateService, // Interfaz, no implementación
    
    @inject(TYPES.DiscordService) 
    private discordService: IDiscordService, // Interfaz, no implementación
    
    @inject(TYPES.WebhookService) 
    private webhookService: IWebhookService // Interfaz, no implementación
  ) {}

  async processRates(): Promise<void> {
    const rates = await this.getRates();
    if (rates) {
      // Usar abstracciones (interfaces)
      const hasChange = await this.notificationStateService.hasSignificantChangeAndNotify(rates);
      if (hasChange) {
        await this.discordService.sendRateUpdateNotification(rates);
        await this.webhookService.sendRateUpdateNotification(rates);
      }
    }
  }
}
```

---

## Checklist

Antes de hacer commit, verificar:

- [x] Código formateado con Biome (`pnpm run format`)
- [x] Sin errores de lint (`pnpm run lint`)
- [x] TypeScript compila sin errores (`pnpm run build`)
- [x] Tests pasan (`pnpm test`)
- [x] Convenciones de nomenclatura seguidas
- [x] No hay `console.log` (usar logger)
- [x] No hay tipos `any` innecesarios
- [x] Comentarios JSDoc para APIs públicas
- [x] Imports organizados correctamente
- [x] Código sigue principios SOLID
- [x] Inversify DI implementado correctamente
- [x] Interfaces bien definidas y usadas
- [x] Inyección de dependencias en constructores
- [x] Sistema de notificaciones persistente implementado

---

## Referencias

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Biome Documentation](https://biomejs.dev/)
- [InversifyJS Documentation](https://inversify.io/)
- [Clean Architecture by Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection Pattern](https://martinfowler.com/articles/injection.html)

---

**Última actualización**: 2025-11-24  
**Versión del servicio**: 2.1.0  
**Estado**: ✅ Completamente implementado y operativo