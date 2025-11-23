import type { OAS3Options } from 'swagger-jsdoc';
import packageJson from '../../package.json';

// URL por defecto para el servidor de producción de Swagger
const DEFAULT_SWAGGER_PROD_URL = 'https://bcv.celsiusaray.com';

// Determinar servidores según el entorno
const isProduction = process.env.NODE_ENV === 'production';
const servers = isProduction
  ? [
      {
        url: process.env.SWAGGER_PROD_URL || DEFAULT_SWAGGER_PROD_URL,
        description: 'Servidor de producción',
      },
    ]
  : [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
      {
        url: process.env.SWAGGER_PROD_URL || DEFAULT_SWAGGER_PROD_URL,
        description: 'Servidor de producción (disponible para pruebas)',
      },
    ];

export const swaggerOptions: OAS3Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BCV Service API',
      version: packageJson.version,
      description:
        'API REST para consultar tasas de cambio del Banco Central de Venezuela (BCV) con actualizaciones en tiempo real mediante WebSockets',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers,
    tags: [
      {
        name: 'Rates',
        description: 'Endpoints para consultar tasas de cambio',
      },
      {
        name: 'Health',
        description: 'Endpoints de health checks para monitoreo',
      },
      {
        name: 'Metrics',
        description: 'Métricas de Prometheus para observabilidad',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key para autenticación',
        },
      },
      schemas: {
        CurrencyRate: {
          type: 'object',
          properties: {
            currency: {
              type: 'string',
              description: 'Código de moneda (ISO 4217)',
              enum: ['EUR', 'CNY', 'TRY', 'RUB', 'USD'],
              example: 'USD',
            },
            rate: {
              type: 'number',
              format: 'double',
              description: 'Tasa de cambio en bolívares',
              example: 243.1105,
            },
            name: {
              type: 'string',
              description: 'Nombre completo de la moneda',
              example: 'Dólar',
            },
          },
          required: ['currency', 'rate', 'name'],
        },
        RateData: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID único del registro (MongoDB ObjectId)',
              example: '69210b11004e71ed86a744ff',
            },
            id: {
              type: 'string',
              description: 'ID compuesto generado automáticamente (fecha-source)',
              example: '2025-11-25-bcv',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Fecha de la tasa en formato YYYY-MM-DD',
              example: '2025-11-25',
            },
            rates: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CurrencyRate',
              },
              description: 'Array de tasas de cambio por moneda',
              example: [
                {
                  currency: 'EUR',
                  rate: 280.04870937,
                  name: 'Euro',
                },
                {
                  currency: 'CNY',
                  rate: 34.2057462,
                  name: 'Yuan',
                },
                {
                  currency: 'TRY',
                  rate: 5.72783475,
                  name: 'Lira Turca',
                },
                {
                  currency: 'RUB',
                  rate: 3.07773768,
                  name: 'Rublo Ruso',
                },
                {
                  currency: 'USD',
                  rate: 243.1105,
                  name: 'Dólar',
                },
              ],
            },
            source: {
              type: 'string',
              description: 'Fuente de los datos',
              example: 'bcv',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de creación del registro',
              example: '2025-11-22T01:00:01.469Z',
            },
          },
          required: ['_id', 'id', 'date', 'rates', 'source', 'createdAt'],
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              oneOf: [
                { $ref: '#/components/schemas/RateData' },
                {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RateData' },
                },
              ],
            },
            count: {
              type: 'number',
              description: 'Número de registros (solo en historial)',
              example: 2,
            },
          },
          required: ['success', 'data'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Mensaje de error',
              example: 'No se encontró tasa para la fecha especificada',
            },
          },
          required: ['success', 'error'],
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded'],
              description: 'Estado general del servicio',
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp del health check',
              example: '2025-11-23T17:53:55.147Z',
            },
            uptime: {
              type: 'number',
              description: 'Tiempo de actividad en segundos',
              example: 42041,
            },
            checks: {
              type: 'object',
              properties: {
                mongodb: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    message: { type: 'string', example: 'MongoDB connection is healthy' },
                  },
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    message: { type: 'string', example: 'Redis is operational' },
                    details: {
                      type: 'object',
                      properties: {
                        enabled: { type: 'boolean', example: true },
                        connected: { type: 'boolean', example: true },
                      },
                    },
                  },
                },
                scheduler: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    message: { type: 'string', example: 'Scheduler is running' },
                  },
                },
                websocket: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    message: { type: 'string', example: 'WebSocket service is healthy' },
                    details: {
                      type: 'object',
                      properties: {
                        connectedClients: { type: 'number', example: 0 },
                      },
                    },
                  },
                },
              },
            },
          },
          required: ['status', 'timestamp', 'uptime', 'checks'],
        },
        ServiceStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              example: 'healthy',
            },
            message: {
              type: 'string',
              example: 'Connected',
            },
          },
          required: ['status'],
        },
        BcvServiceStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              example: 'healthy',
            },
            lastUpdate: {
              type: 'string',
              format: 'date-time',
              example: '2025-11-12T10:00:00.000Z',
            },
          },
          required: ['status'],
        },
        WebSocketServiceStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              example: 'healthy',
            },
            connections: {
              type: 'number',
              description: 'Número de clientes conectados',
              example: 5,
            },
          },
          required: ['status', 'connections'],
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'API key faltante o inválida',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'API key is required' },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'API key no autorizada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Invalid API key' },
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Límite de rate excedido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'string',
                    example: 'Too many requests, please try again later',
                  },
                },
              },
            },
          },
        },
        ServiceUnavailable: {
          description: 'Servicio no disponible',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'string',
                    example: 'Service unavailable in console mode',
                  },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      '/api/rate/latest': {
        get: {
          tags: ['Rates'],
          summary: 'Obtener la tasa de cambio más reciente',
          description:
            'Retorna la tasa de cambio más reciente almacenada en la base de datos',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Tasa obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/RateData',
                      },
                    },
                  },
                  example: {
                    success: true,
                    data: {
                      _id: '69210b11004e71ed86a744ff',
                      id: '2025-11-25-bcv',
                      createdAt: '2025-11-22T01:00:01.469Z',
                      date: '2025-11-25',
                      rates: [
                        {
                          currency: 'EUR',
                          rate: 280.04870937,
                          name: 'Euro',
                        },
                        {
                          currency: 'CNY',
                          rate: 34.2057462,
                          name: 'Yuan',
                        },
                        {
                          currency: 'TRY',
                          rate: 5.72783475,
                          name: 'Lira Turca',
                        },
                        {
                          currency: 'RUB',
                          rate: 3.07773768,
                          name: 'Rublo Ruso',
                        },
                        {
                          currency: 'USD',
                          rate: 243.1105,
                          name: 'Dólar',
                        },
                      ],
                      source: 'bcv',
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
            '429': {
              $ref: '#/components/responses/TooManyRequests',
            },
            '503': {
              $ref: '#/components/responses/ServiceUnavailable',
            },
          },
        },
      },
      '/api/rate/history': {
        get: {
          tags: ['Rates'],
          summary: 'Obtener historial de tasas',
          description: 'Retorna el historial de tasas de cambio almacenadas',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              description: 'Número máximo de registros a retornar',
              required: false,
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 30,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Historial obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/RateData',
                        },
                      },
                      count: {
                        type: 'number',
                        example: 2,
                      },
                    },
                  },
                  example: {
                    success: true,
                    data: [
                      {
                        _id: '69210b11004e71ed86a744ff',
                        id: '2025-11-25-bcv',
                        createdAt: '2025-11-22T01:00:01.469Z',
                        date: '2025-11-25',
                        rates: [
                          {
                            currency: 'EUR',
                            rate: 280.04870937,
                            name: 'Euro',
                          },
                          {
                            currency: 'CNY',
                            rate: 34.2057462,
                            name: 'Yuan',
                          },
                          {
                            currency: 'TRY',
                            rate: 5.72783475,
                            name: 'Lira Turca',
                          },
                          {
                            currency: 'RUB',
                            rate: 3.07773768,
                            name: 'Rublo Ruso',
                          },
                          {
                            currency: 'USD',
                            rate: 243.1105,
                            name: 'Dólar',
                          },
                        ],
                        source: 'bcv',
                      },
                      {
                        _id: '691f8f62004e71ed86a6be1c',
                        id: '2025-11-21-bcv',
                        createdAt: '2025-11-20T22:00:01.773Z',
                        date: '2025-11-21',
                        rates: [
                          {
                            currency: 'EUR',
                            rate: 278.42830812,
                            name: 'Euro',
                          },
                          {
                            currency: 'CNY',
                            rate: 33.95811076,
                            name: 'Yuan',
                          },
                          {
                            currency: 'TRY',
                            rate: 5.70180345,
                            name: 'Lira Turca',
                          },
                          {
                            currency: 'RUB',
                            rate: 3.01257014,
                            name: 'Rublo Ruso',
                          },
                          {
                            currency: 'USD',
                            rate: 241.578,
                            name: 'Dólar',
                          },
                        ],
                        source: 'bcv',
                      },
                    ],
                    count: 2,
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '429': {
              $ref: '#/components/responses/TooManyRequests',
            },
            '503': {
              $ref: '#/components/responses/ServiceUnavailable',
            },
          },
        },
      },
      '/api/rate/{date}': {
        get: {
          tags: ['Rates'],
          summary: 'Obtener tasa para una fecha específica',
          description: 'Retorna la tasa de cambio para una fecha específica',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'date',
              in: 'path',
              description: 'Fecha en formato YYYY-MM-DD',
              required: true,
              schema: {
                type: 'string',
                format: 'date',
                example: '2025-11-12',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Tasa obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/RateData',
                      },
                    },
                  },
                  example: {
                    success: true,
                    data: {
                      _id: '69210b11004e71ed86a744ff',
                      id: '2025-11-25-bcv',
                      createdAt: '2025-11-22T01:00:01.469Z',
                      date: '2025-11-25',
                      rates: [
                        {
                          currency: 'EUR',
                          rate: 280.04870937,
                          name: 'Euro',
                        },
                        {
                          currency: 'CNY',
                          rate: 34.2057462,
                          name: 'Yuan',
                        },
                        {
                          currency: 'TRY',
                          rate: 5.72783475,
                          name: 'Lira Turca',
                        },
                        {
                          currency: 'RUB',
                          rate: 3.07773768,
                          name: 'Rublo Ruso',
                        },
                        {
                          currency: 'USD',
                          rate: 243.1105,
                          name: 'Dólar',
                        },
                      ],
                      source: 'bcv',
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
            '429': {
              $ref: '#/components/responses/TooManyRequests',
            },
            '503': {
              $ref: '#/components/responses/ServiceUnavailable',
            },
          },
        },
      },
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check completo',
          description:
            'Retorna el estado de salud de todos los componentes del servicio',
          responses: {
            '200': {
              description: 'Servicio saludable',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthCheck',
                  },
                  example: {
                    status: 'healthy',
                    timestamp: '2025-11-23T17:53:55.147Z',
                    uptime: 42041,
                    checks: {
                      mongodb: {
                        status: 'healthy',
                        message: 'MongoDB connection is healthy',
                      },
                      redis: {
                        status: 'healthy',
                        message: 'Redis is operational',
                        details: {
                          enabled: true,
                          connected: true,
                        },
                      },
                      scheduler: {
                        status: 'healthy',
                        message: 'Scheduler is running',
                      },
                      websocket: {
                        status: 'healthy',
                        message: 'WebSocket service is healthy',
                        details: {
                          connectedClients: 0,
                        },
                      },
                    },
                  },
                },
              },
            },
            '503': {
              description: 'Servicio no saludable',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthCheck',
                  },
                  example: {
                    status: 'healthy',
                    timestamp: '2025-11-23T17:53:55.147Z',
                    uptime: 42041,
                    checks: {
                      mongodb: {
                        status: 'healthy',
                        message: 'MongoDB connection is healthy',
                      },
                      redis: {
                        status: 'healthy',
                        message: 'Redis is operational',
                        details: {
                          enabled: true,
                          connected: true,
                        },
                      },
                      scheduler: {
                        status: 'healthy',
                        message: 'Scheduler is running',
                      },
                      websocket: {
                        status: 'healthy',
                        message: 'WebSocket service is healthy',
                        details: {
                          connectedClients: 0,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/healthz': {
        get: {
          tags: ['Health'],
          summary: 'Kubernetes liveness probe',
          description:
            'Health check simplificado para Kubernetes liveness probe',
          responses: {
            '200': {
              description: 'Servicio vivo',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                    example: 'OK',
                  },
                },
              },
            },
            '503': {
              description: 'Servicio no disponible',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                    example: 'Service Unavailable',
                  },
                },
              },
            },
          },
        },
      },
      '/readyz': {
        get: {
          tags: ['Health'],
          summary: 'Kubernetes readiness probe',
          description: 'Health check para Kubernetes readiness probe',
          responses: {
            '200': {
              description: 'Servicio listo',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                    example: 'Ready',
                  },
                },
              },
            },
            '503': {
              description: 'Servicio no listo',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                    example: 'Not Ready',
                  },
                },
              },
            },
          },
        },
      },
      '/health/mongodb': {
        get: {
          tags: ['Health'],
          summary: 'Health check de MongoDB',
          description: 'Verifica la conectividad con MongoDB',
          responses: {
            '200': {
              description: 'MongoDB conectado',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ServiceStatus',
                  },
                },
              },
            },
            '503': {
              description: 'MongoDB no disponible',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ServiceStatus',
                  },
                },
              },
            },
          },
        },
      },
      '/health/scheduler': {
        get: {
          tags: ['Health'],
          summary: 'Health check del scheduler',
          description: 'Verifica el estado del cron scheduler',
          responses: {
            '200': {
              description: 'Scheduler ejecutándose',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ServiceStatus',
                  },
                },
              },
            },
            '503': {
              description: 'Scheduler no disponible',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ServiceStatus',
                  },
                },
              },
            },
          },
        },
      },
      '/health/bcv': {
        get: {
          tags: ['Health'],
          summary: 'Health check del servicio BCV',
          description: 'Verifica el estado del scraping del BCV',
          responses: {
            '200': {
              description: 'Servicio BCV operativo',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/BcvServiceStatus',
                  },
                },
              },
            },
            '503': {
              description: 'Servicio BCV no disponible',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/BcvServiceStatus',
                  },
                },
              },
            },
          },
        },
      },
      '/health/websocket': {
        get: {
          tags: ['Health'],
          summary: 'Health check del WebSocket',
          description: 'Verifica el estado del servicio WebSocket',
          responses: {
            '200': {
              description: 'WebSocket operativo',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/WebSocketServiceStatus',
                  },
                },
              },
            },
            '503': {
              description: 'WebSocket no disponible',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/WebSocketServiceStatus',
                  },
                },
              },
            },
          },
        },
      },
      '/metrics': {
        get: {
          tags: ['Metrics'],
          summary: 'Métricas de Prometheus',
          description:
            'Expone métricas en formato Prometheus para scraping y monitoreo',
          responses: {
            '200': {
              description: 'Métricas expuestas exitosamente',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                    example:
                      '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",route="/api/rate/latest",status_code="200"} 150\n\n# HELP bcv_latest_rate Latest BCV exchange rate\n# TYPE bcv_latest_rate gauge\nbcv_latest_rate{currency="USD"} 36.50',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};
