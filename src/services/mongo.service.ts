import { injectable, inject } from 'inversify';
import { MongoClient, Db, Collection } from 'mongodb';
import { Rate } from '@/models/rate';
import { ICacheService } from '@/services/cache.interface';
import log from '@/utils/logger';
import { TYPES } from '@/config/types';

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
    @inject(TYPES.Config) config: { mongoUri: string }
  ) {
    this.client = new MongoClient(config.mongoUri);
    this.db = this.client.db();
    this.collection = this.db.collection<Rate>('rates');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    log.info('Conectado a MongoDB', {
      database: this.db.databaseName,
      collection: this.collection.collectionName
    });

    // Crear índices
    await this.collection.createIndex({ date: 1 });
    await this.collection.createIndex({ createdAt: -1 });
    await this.collection.createIndex({ date: 1, source: 1 }, { unique: true });

    log.debug('Índices de MongoDB creados', {
      indexes: ['date', 'createdAt', 'date+source (unique)']
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
      rates: rate.rates || [],  // Incluir todas las tasas
      date: rate.date,
      source: rate.source,
      createdAt
    };

    // Usar upsert para evitar duplicados
    await this.collection.updateOne(
      { id },
      { $set: rateToInsert },
      { upsert: true }
    );

    return rateToInsert;
  }

  async getLatestRate(): Promise<Rate | null> {
    const result = await this.collection
      .find()
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
      
    return result.length > 0 ? result[0] : null;
  }

  async getRateByDate(date: string): Promise<Rate | null> {
    // Buscar por fecha (puede coincidir con el comienzo de la fecha)
    const result = await this.collection
      .findOne({ 
        date: { $regex: `^${date}`, $options: 'i' } 
      }, { 
        sort: { createdAt: -1 } 
      });
      
    return result || null;
  }

  async getRateHistory(limit: number = 30): Promise<Rate[]> {
    const result = await this.collection
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
      
    return result;
  }

  async getAllRates(): Promise<Rate[]> {
    const result = await this.collection
      .find()
      .sort({ createdAt: -1 })
      .toArray();
      
    return result;
  }
}