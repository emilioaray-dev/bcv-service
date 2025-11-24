import type { NotificationState } from '@/interfaces/INotificationStateService';
import type { Rate } from '@/models/rate';

export interface ICacheService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<void>;
  saveRate(rate: Omit<Rate, 'id' | 'createdAt'>): Promise<Rate>;
  getLatestRate(): Promise<Rate | null>;
  getRateByDate(date: string): Promise<Rate | null>;
  getRateHistory(limit?: number): Promise<Rate[]>;
  getRatesByDateRange(startDate: string, endDate: string, limit?: number): Promise<Rate[]>;
  getAllRates(): Promise<Rate[]>;
  getNotificationState(id: string): Promise<NotificationState | null>;
  saveNotificationState(id: string, state: NotificationState): Promise<void>;
}
