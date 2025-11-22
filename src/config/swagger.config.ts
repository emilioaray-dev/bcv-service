import type { OAS3Options } from 'swagger-jsdoc';
import packageJson from '../../package.json';

// Determinar servidores según el entorno
const isProduction = process.env.NODE_ENV === 'production';
const servers = isProduction
  ? [
      {
        url: process.env.SWAGGER_PROD_URL || 'https://api.example.com',
        description: 'Servidor de producción',
      },
    ]
  : [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
      {
        url: process.env.SWAGGER_PROD_URL || 'https://api.example.com',
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
              example: 'USD',
            },
            rate: {
              type: 'number',
              format: 'double',
              description: 'Tasa de cambio',
              example: 36.5,
            },
            name: {
              type: 'string',
              description: 'Nombre completo de la moneda',
              example: 'Dólar de los Estados Unidos de América',
            },
          },
          required: ['currency', 'rate', 'name'],
        },
        RateData: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID único del registro',
              example: '67330d5f123abc456def7890',
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de la tasa',
              example: '2025-11-12T00:00:00.000Z',
            },
            rates: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CurrencyRate',
              },
              description: 'Array de tasas por moneda',
            },
            source: {
              type: 'string',
              description: 'Fuente de los datos',
              example: 'bcv',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del registro',
              example: '2025-11-12T10:30:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización',
              example: '2025-11-12T10:30:00.000Z',
            },
          },
          required: ['_id', 'date', 'rates', 'source'],
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
              example: 10,
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
              enum: ['healthy', 'unhealthy'],
              description: 'Estado general del servicio',
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp del health check',
              example: '2025-11-12T10:30:00.000Z',
            },
            uptime: {
              type: 'number',
              description: 'Tiempo de actividad en segundos',
              example: 86400,
            },
            services: {
              type: 'object',
              properties: {
                mongodb: {
                  $ref: '#/components/schemas/ServiceStatus',
                },
                scheduler: {
                  $ref: '#/components/schemas/ServiceStatus',
                },
                bcv: {
                  $ref: '#/components/schemas/BcvServiceStatus',
                },
                websocket: {
                  $ref: '#/components/schemas/WebSocketServiceStatus',
                },
              },
            },
          },
          required: ['status', 'timestamp', 'uptime', 'services'],
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
                    $ref: '#/components/schemas/SuccessResponse',
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
                        example: 10,
                      },
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
                    $ref: '#/components/schemas/SuccessResponse',
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
