import { TYPES } from '@/config/types';
import type { Rate } from '@/models/rate';
import type { ICacheService } from '@/services/cache.interface';
import log from '@/utils/logger';
import { inject, injectable } from 'inversify';
import { type Collection, type Db, MongoClient } from 'mongodb';

/**
 * MongoService - Servicio de persistencia con MongoDB
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Gestionar persistencia de tasas en MongoDB
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Implementa la interfaz ICacheService (abstracción)
 * - No depende de detalles de implementación externa
 */
@injectable()
export class MongoService implements ICacheService {
  private client: MongoClient;
  private db: Db;
  private collection: Collection<Rate>;

  constructor(
    @inject(TYPES.Config) config: {
      mongoUri: string;
      mongodb: {
        maxPoolSize: number;
        minPoolSize: number;
        maxIdleTimeMS: number;
        connectTimeoutMS: number;
        socketTimeoutMS: number;
        serverSelectionTimeoutMS: number;
        heartbeatFrequencyMS: number;
        retryWrites: boolean;
        retryReads: boolean;
        compressors: string[];
      };
    }
  ) {
    // Create MongoDB client with optimized connection pool settings
    this.client = new MongoClient(config.mongoUri, {
      maxPoolSize: config.mongodb.maxPoolSize,
      minPoolSize: config.mongodb.minPoolSize,
      maxIdleTimeMS: config.mongodb.maxIdleTimeMS,
      connectTimeoutMS: config.mongodb.connectTimeoutMS,
      socketTimeoutMS: config.mongodb.socketTimeoutMS,
      serverSelectionTimeoutMS: config.mongodb.serverSelectionTimeoutMS,
      heartbeatFrequencyMS: config.mongodb.heartbeatFrequencyMS,
      retryWrites: config.mongodb.retryWrites,
      retryReads: config.mongodb.retryReads,
      compressors: config.mongodb.compressors as ('none' | 'snappy' | 'zlib' | 'zstd')[],
    });
    this.db = this.client.db();
    this.collection = this.db.collection<Rate>('rates');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    log.info('Conectado a MongoDB', {
      database: this.db.databaseName,
      collection: this.collection.collectionName,
      poolSize: {
        max: this.client.options.maxPoolSize,
        min: this.client.options.minPoolSize,
      },
    });

    // Create optimized indexes for common queries
    // Indexes are created idempotently (MongoDB skips if already exists)
    await Promise.all([
      // 1. Index for getLatestRate() - sorted by createdAt descending
      this.collection.createIndex(
        { createdAt: -1 },
        {
          name: 'idx_createdAt_desc',
          background: true,
        }
      ),

      // 2. Index for getRateByDate() - regex search on date field
      this.collection.createIndex(
        { date: 1 },
        {
          name: 'idx_date_asc',
          background: true,
        }
      ),

      // 3. Compound index for unique rate identification
      this.collection.createIndex(
        { date: 1, source: 1 },
        {
          unique: true,
          name: 'idx_date_source_unique',
          background: true,
        }
      ),

      // 4. Index for history queries - optimized for sorting
      this.collection.createIndex(
        { date: -1, createdAt: -1 },
        {
          name: 'idx_date_createdAt_desc',
          background: true,
        }
      ),

      // 5. Index on id field for quick upserts
      this.collection.createIndex(
        { id: 1 },
        {
          name: 'idx_id_asc',
          background: true,
        }
      ),
    ]);

    log.info('MongoDB indexes created/verified', {
      indexes: [
        'idx_createdAt_desc',
        'idx_date_asc',
        'idx_date_source_unique',
        'idx_date_createdAt_desc',
        'idx_id_asc',
      ],
    });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async saveRate(rate: Omit<Rate, 'id' | 'createdAt'>): Promise<Rate> {
    const id = `${rate.date}-${rate.source}`;
    const createdAt = new Date().toISOString();

    const rateToInsert: Rate = {
      id,
      rate: rate.rate,
      rates: rate.rates || [], // Incluir todas las tasas
      date: rate.date,
      source: rate.source,
      createdAt,
    };

    // Usar upsert para evitar duplicados
    await this.collection.updateOne({ id }, { $set: rateToInsert }, { upsert: true });

    return rateToInsert;
  }

  async getLatestRate(): Promise<Rate | null> {
    const result = await this.collection.find().sort({ createdAt: -1 }).limit(1).toArray();

    return result.length > 0 ? result[0] : null;
  }

  async getRateByDate(date: string): Promise<Rate | null> {
    // Buscar por fecha (puede coincidir con el comienzo de la fecha)
    const result = await this.collection.findOne(
      {
        date: { $regex: `^${date}`, $options: 'i' },
      },
      {
        sort: { createdAt: -1 },
      }
    );

    return result || null;
  }

  async getRateHistory(limit = 30): Promise<Rate[]> {
    const result = await this.collection.find().sort({ createdAt: -1 }).limit(limit).toArray();

    return result;
  }

  async getAllRates(): Promise<Rate[]> {
    const result = await this.collection.find().sort({ createdAt: -1 }).toArray();

    return result;
  }
}
