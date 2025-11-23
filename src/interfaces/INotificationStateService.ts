import type { BCVRateData } from '@/services/bcv.service';

export interface NotificationState {
  _id?: string;
  lastNotifiedRate: BCVRateData;
  lastNotificationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationStateService {
  /**
   * Obtener el estado de la última notificación
   */
  getLastNotificationState(): Promise<NotificationState | null>;

  /**
   * Actualizar el estado de la última notificación
   * @param rateData La tasa que se notificó
   */
  updateNotificationState(rateData: BCVRateData): Promise<NotificationState>;

  /**
   * Verificar si hay cambios significativos y actualizar el estado si es necesario
   * @param currentRate La tasa actual
   * @param threshold Umbral para considerar cambio significativo (default: 0.01)
   * @returns true si hubo cambios significativos, false en caso contrario
   */
  hasSignificantChangeAndNotify(
    currentRate: BCVRateData,
    threshold?: number
  ): Promise<boolean>;
}
