import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { injectable } from 'inversify';
import type { Collection } from 'mongodb';
import { MongoClient } from 'mongodb';

import { config } from '@/config';
import type { IWebhookQueueService } from '@/interfaces/IWebhookQueueService';
import type {
  WebhookQueueItem,
  WebhookQueueStats,
} from '@/models/webhook-queue';
import { logger as log } from '@/utils/logger';

/**
 * Servicio de cola de webhooks con reintentos persistentes
 *
 * Features:
 * - Cola persistente en MongoDB
 * - Reintentos automáticos con backoff exponencial
 * - Worker que procesa webhooks pendientes cada X minutos
 * - Sobrevive a reinicios del servidor
 * - Limpieza automática de webhooks completados antiguos
 */
@injectable()
export class WebhookQueueService implements IWebhookQueueService {
  private collection!: Collection<WebhookQueueItem>;
  private initialized = false;
  private client: MongoClient;
  private workerInterval?: NodeJS.Timeout;
  private isProcessing = false;

  constructor() {
    this.client = new MongoClient(config.mongoUri);
    this.initialize().catch((error) => {
      log.error('Error initializing WebhookQueueService', { error });
    });
  }

  private async initialize(): Promise<void> {
    try {
      await this.client.connect();
      const db = this.client.db();

      this.collection = db.collection<WebhookQueueItem>('webhook_queue');

      // Crear índices
      await this.createIndexes();

      // Recuperar webhooks que estaban "processing" cuando el servidor se cayó
      await this.recoverStuckWebhooks();

      this.initialized = true;
      log.info('WebhookQueueService initialized');
    } catch (error) {
      log.error('Failed to initialize WebhookQueueService', { error });
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) return;

    try {
      await this.collection.createIndex(
        { status: 1, nextAttemptAt: 1 },
        { name: 'idx_status_nextAttempt' }
      );

      await this.collection.createIndex(
        { createdAt: -1 },
        { name: 'idx_createdAt' }
      );

      await this.collection.createIndex(
        { 'metadata.priority': -1, nextAttemptAt: 1 },
        { name: 'idx_priority_nextAttempt' }
      );

      log.info('Webhook queue indexes created');
    } catch (error) {
      log.error('Error creating webhook queue indexes', { error });
    }
  }

  /**
   * Recupera webhooks que quedaron en "processing" por un crash
   */
  private async recoverStuckWebhooks(): Promise<void> {
    if (!this.collection) return;

    try {
      const result = await this.collection.updateMany(
        { status: 'processing' },
        {
          $set: {
            status: 'pending',
            nextAttemptAt: new Date(), // Reintentar ahora
          },
        }
      );

      if (result.modifiedCount > 0) {
        log.warn('Recovered stuck webhooks', { count: result.modifiedCount });
      }
    } catch (error) {
      log.error('Error recovering stuck webhooks', { error });
    }
  }

  async enqueue(
    event: string,
    url: string,
    payload: unknown,
    options?: {
      maxAttempts?: number;
      priority?: 'high' | 'normal' | 'low';
      delaySeconds?: number;
    }
  ): Promise<string> {
    if (!this.initialized || !this.collection) {
      log.warn('Webhook queue not initialized - webhook will not be queued');
      throw new Error('Webhook queue not available');
    }

    const id = randomUUID();
    const now = new Date();
    const nextAttemptAt = new Date(
      now.getTime() + (options?.delaySeconds || 0) * 1000
    );

    const item: WebhookQueueItem = {
      id,
      event,
      url,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: options?.maxAttempts || 5,
      nextAttemptAt,
      createdAt: now,
      metadata: {
        priority: options?.priority || 'normal',
      },
    };

    try {
      await this.collection.insertOne(item as any);
      log.debug('Webhook queued', { id, event, url: this.maskUrl(url) });
      return id;
    } catch (error) {
      log.error('Error enqueueing webhook', { error, event });
      throw error;
    }
  }

  async processQueue(): Promise<void> {
    if (!this.initialized || !this.collection) {
      log.debug('Queue processing skipped - not initialized');
      return;
    }

    if (this.isProcessing) {
      log.debug('Queue already being processed, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      const webhooks = await this.getPendingWebhooks(10); // Procesar 10 a la vez

      if (webhooks.length === 0) {
        log.debug('No pending webhooks to process');
        return;
      }

      log.info('Processing webhook queue', { count: webhooks.length });

      // Procesar en paralelo (máximo 5 a la vez)
      const promises = webhooks.map((webhook) => this.processWebhook(webhook));
      await Promise.allSettled(promises);

      log.info('Queue processing completed', { processed: webhooks.length });
    } catch (error) {
      log.error('Error processing queue', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processWebhook(webhook: WebhookQueueItem): Promise<void> {
    try {
      // Marcar como "processing"
      await this.collection.updateOne(
        { id: webhook.id },
        {
          $set: {
            status: 'processing',
            lastAttemptAt: new Date(),
          },
        }
      );

      // Intentar enviar webhook
      const response = await axios.post(webhook.url, webhook.payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BCV-Service-Webhook-Queue/1.0',
        },
        timeout: 10000,
      });

      if (response.status >= 200 && response.status < 300) {
        // Éxito
        await this.markAsCompleted(webhook.id);
        log.info('Webhook sent successfully from queue', {
          id: webhook.id,
          event: webhook.event,
          attempts: webhook.attempts + 1,
        });
      } else {
        // Respuesta no exitosa
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      log.error('Webhook failed from queue', {
        id: webhook.id,
        event: webhook.event,
        attempts: webhook.attempts + 1,
        error: errorMessage,
      });

      await this.markAsFailed(webhook.id, errorMessage);
    }
  }

  async getPendingWebhooks(limit = 10): Promise<WebhookQueueItem[]> {
    if (!this.initialized || !this.collection) return [];

    try {
      const now = new Date();

      return await this.collection
        .find({
          status: 'pending',
          nextAttemptAt: { $lte: now },
        })
        .sort({
          'metadata.priority': -1, // high > normal > low
          nextAttemptAt: 1, // Más antiguos primero
        })
        .limit(limit)
        .toArray();
    } catch (error) {
      log.error('Error getting pending webhooks', { error });
      return [];
    }
  }

  async markAsCompleted(id: string): Promise<void> {
    if (!this.initialized || !this.collection) return;

    try {
      await this.collection.updateOne(
        { id },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
          },
        }
      );
    } catch (error) {
      log.error('Error marking webhook as completed', { error, id });
    }
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    if (!this.initialized || !this.collection) return;

    try {
      const webhook = await this.collection.findOne({ id });

      if (!webhook) {
        log.warn('Webhook not found for failure marking', { id });
        return;
      }

      const newAttempts = webhook.attempts + 1;
      const hasMoreAttempts = newAttempts < webhook.maxAttempts;

      if (hasMoreAttempts) {
        // Calcular próximo intento con backoff exponencial
        // Intento 1: +5 min, Intento 2: +10 min, Intento 3: +20 min, etc.
        const delayMinutes = Math.min(5 * 2 ** newAttempts, 60); // Max 60 min
        const nextAttemptAt = new Date(Date.now() + delayMinutes * 60 * 1000);

        await this.collection.updateOne(
          { id },
          {
            $set: {
              status: 'pending',
              attempts: newAttempts,
              error,
              nextAttemptAt,
            },
          }
        );

        log.info('Webhook will be retried', {
          id,
          attempts: newAttempts,
          maxAttempts: webhook.maxAttempts,
          nextAttemptIn: `${delayMinutes} minutes`,
        });
      } else {
        // Sin más intentos - marcar como failed permanentemente
        await this.collection.updateOne(
          { id },
          {
            $set: {
              status: 'failed',
              attempts: newAttempts,
              error,
              completedAt: new Date(),
            },
          }
        );

        log.error('Webhook failed permanently after max attempts', {
          id,
          event: webhook.event,
          attempts: newAttempts,
          error,
        });
      }
    } catch (error_) {
      log.error('Error marking webhook as failed', { error: error_, id });
    }
  }

  async getQueueStats(): Promise<WebhookQueueStats> {
    if (!this.initialized || !this.collection) {
      return {
        pending: 0,
        processing: 0,
        failed: 0,
        completed: 0,
        total: 0,
      };
    }

    try {
      const [pending, processing, failed, completed, total] = await Promise.all(
        [
          this.collection.countDocuments({ status: 'pending' }),
          this.collection.countDocuments({ status: 'processing' }),
          this.collection.countDocuments({ status: 'failed' }),
          this.collection.countDocuments({ status: 'completed' }),
          this.collection.countDocuments({}),
        ]
      );

      return {
        pending,
        processing,
        failed,
        completed,
        total,
      };
    } catch (error) {
      log.error('Error getting queue stats', { error });
      return {
        pending: 0,
        processing: 0,
        failed: 0,
        completed: 0,
        total: 0,
      };
    }
  }

  async cleanOldWebhooks(olderThanDays: number): Promise<number> {
    if (!this.initialized || !this.collection) return 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.collection.deleteMany({
        status: 'completed',
        completedAt: { $lt: cutoffDate },
      });

      if (result.deletedCount > 0) {
        log.info('Cleaned old completed webhooks', {
          count: result.deletedCount,
          olderThanDays,
        });
      }

      return result.deletedCount;
    } catch (error) {
      log.error('Error cleaning old webhooks', { error });
      return 0;
    }
  }

  startWorker(intervalSeconds = 60): void {
    if (this.workerInterval) {
      log.warn('Worker already started');
      return;
    }

    log.info('Starting webhook queue worker', {
      intervalSeconds,
    });

    // Procesar inmediatamente al iniciar
    this.processQueue().catch((error) => {
      log.error('Error in initial queue processing', { error });
    });

    // Luego procesar periódicamente
    this.workerInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        log.error('Error in queue worker', { error });
      });
    }, intervalSeconds * 1000);

    // Limpieza diaria de webhooks completados antiguos (> 7 días)
    setInterval(
      () => {
        this.cleanOldWebhooks(7).catch((error) => {
          log.error('Error in cleanup task', { error });
        });
      },
      24 * 60 * 60 * 1000
    ); // Una vez al día
  }

  stopWorker(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = undefined;
      log.info('Webhook queue worker stopped');
    }
  }

  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}/***`;
    } catch {
      return '***';
    }
  }
}
