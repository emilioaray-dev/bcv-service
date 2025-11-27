import { randomUUID } from 'node:crypto';
import { config } from '@/config';
import type { IWebhookDeliveryService } from '@/interfaces/IWebhookDeliveryService';
import type {
  WebhookDelivery,
  WebhookDeliveryStats,
} from '@/models/webhook-delivery';
import { logger as log } from '@/utils/logger';
import { injectable } from 'inversify';
import type { Collection } from 'mongodb';
import { MongoClient } from 'mongodb';

/**
 * Servicio para tracking de entregas de webhooks
 *
 * Almacena el historial de todas las entregas de webhooks en MongoDB
 * para análisis, debugging y confirmación de entregas.
 */
@injectable()
export class WebhookDeliveryService implements IWebhookDeliveryService {
  private collection!: Collection<WebhookDelivery>;
  private initialized = false;
  private client: MongoClient;

  constructor() {
    this.client = new MongoClient(config.mongoUri);
    this.initialize().catch((error) => {
      log.error('Error initializing WebhookDeliveryService', { error });
    });
  }

  private async initialize(): Promise<void> {
    try {
      await this.client.connect();
      // Usa la base de datos por defecto del URI
      const db = this.client.db();

      if (!db) {
        log.warn('Database not available - webhook delivery tracking disabled');
        return;
      }

      this.collection = db.collection<WebhookDelivery>('webhook_deliveries');

      // Crear índices para queries eficientes
      await this.createIndexes();

      this.initialized = true;
      log.info('WebhookDeliveryService initialized');
    } catch (error) {
      log.error('Failed to initialize WebhookDeliveryService', { error });
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) return;

    try {
      await this.collection.createIndex(
        { timestamp: -1 },
        { name: 'idx_timestamp_desc' }
      );

      await this.collection.createIndex(
        { event: 1, timestamp: -1 },
        { name: 'idx_event_timestamp' }
      );

      await this.collection.createIndex(
        { url: 1, timestamp: -1 },
        { name: 'idx_url_timestamp' }
      );

      await this.collection.createIndex(
        { success: 1, timestamp: -1 },
        { name: 'idx_success_timestamp' }
      );

      log.info('Webhook delivery indexes created');
    } catch (error) {
      log.error('Error creating webhook delivery indexes', { error });
    }
  }

  async recordDelivery(
    delivery: Omit<WebhookDelivery, 'id' | 'timestamp'>
  ): Promise<void> {
    if (!this.initialized || !this.collection) {
      log.debug('Webhook delivery tracking skipped - service not initialized');
      return;
    }

    try {
      const record: WebhookDelivery = {
        id: randomUUID(),
        timestamp: new Date(),
        ...delivery,
      };

      // biome-ignore lint/suspicious/noExplicitAny: MongoDB OptionalId type compatibility
      await this.collection.insertOne(record as any);

      log.debug('Webhook delivery recorded', {
        id: record.id,
        event: record.event,
        success: record.success,
      });
    } catch (error) {
      log.error('Error recording webhook delivery', {
        error,
        event: delivery.event,
      });
    }
  }

  async getDeliveriesByEvent(
    event: string,
    limit = 50
  ): Promise<WebhookDelivery[]> {
    if (!this.initialized || !this.collection) return [];

    try {
      return await this.collection
        .find({ event })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      log.error('Error getting deliveries by event', { error, event });
      return [];
    }
  }

  async getDeliveriesByUrl(
    url: string,
    limit = 50
  ): Promise<WebhookDelivery[]> {
    if (!this.initialized || !this.collection) return [];

    try {
      return await this.collection
        .find({ url })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      log.error('Error getting deliveries by URL', { error, url });
      return [];
    }
  }

  async getRecentDeliveries(limit = 50): Promise<WebhookDelivery[]> {
    if (!this.initialized || !this.collection) return [];

    try {
      return await this.collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      log.error('Error getting recent deliveries', { error });
      return [];
    }
  }

  async getDeliveryStats(since?: Date): Promise<WebhookDeliveryStats> {
    if (!this.initialized || !this.collection) {
      return this.getEmptyStats();
    }

    try {
      const query = since ? { timestamp: { $gte: since } } : {};

      const deliveries = await this.collection.find(query).toArray();

      const totalDeliveries = deliveries.length;
      const successfulDeliveries = deliveries.filter((d) => d.success).length;
      const failedDeliveries = totalDeliveries - successfulDeliveries;

      const successRate =
        totalDeliveries > 0
          ? (successfulDeliveries / totalDeliveries) * 100
          : 0;

      const averageDuration =
        totalDeliveries > 0
          ? deliveries.reduce((sum, d) => sum + d.duration, 0) / totalDeliveries
          : 0;

      const lastDelivery = deliveries[0]?.timestamp;
      const lastSuccess = deliveries.find((d) => d.success)?.timestamp;
      const lastFailure = deliveries.find((d) => !d.success)?.timestamp;

      return {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate: Number(successRate.toFixed(2)),
        averageDuration: Number(averageDuration.toFixed(2)),
        lastDelivery,
        lastSuccess,
        lastFailure,
      };
    } catch (error) {
      log.error('Error getting delivery stats', { error });
      return this.getEmptyStats();
    }
  }

  async getDeliveryStatsByEvent(
    event: string,
    since?: Date
  ): Promise<WebhookDeliveryStats> {
    if (!this.initialized || !this.collection) {
      return this.getEmptyStats();
    }

    try {
      const query = since ? { event, timestamp: { $gte: since } } : { event };

      const deliveries = await this.collection.find(query).toArray();

      const totalDeliveries = deliveries.length;
      const successfulDeliveries = deliveries.filter((d) => d.success).length;
      const failedDeliveries = totalDeliveries - successfulDeliveries;

      const successRate =
        totalDeliveries > 0
          ? (successfulDeliveries / totalDeliveries) * 100
          : 0;

      const averageDuration =
        totalDeliveries > 0
          ? deliveries.reduce((sum, d) => sum + d.duration, 0) / totalDeliveries
          : 0;

      const lastDelivery = deliveries[0]?.timestamp;
      const lastSuccess = deliveries.find((d) => d.success)?.timestamp;
      const lastFailure = deliveries.find((d) => !d.success)?.timestamp;

      return {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate: Number(successRate.toFixed(2)),
        averageDuration: Number(averageDuration.toFixed(2)),
        lastDelivery,
        lastSuccess,
        lastFailure,
      };
    } catch (error) {
      log.error('Error getting delivery stats by event', { error, event });
      return this.getEmptyStats();
    }
  }

  async wasRecentlyDelivered(
    event: string,
    hoursAgo: number
  ): Promise<boolean> {
    if (!this.initialized || !this.collection) return false;

    try {
      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      const delivery = await this.collection.findOne({
        event,
        success: true,
        timestamp: { $gte: since },
      });

      return !!delivery;
    } catch (error) {
      log.error('Error checking recent delivery', { error, event });
      return false;
    }
  }

  private getEmptyStats(): WebhookDeliveryStats {
    return {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      successRate: 0,
      averageDuration: 0,
    };
  }
}
