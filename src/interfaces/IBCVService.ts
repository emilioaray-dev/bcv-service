import { BCVRateData } from '@/services/bcv.service';

/**
 * Interface for BCV scraping service
 *
 * Siguiendo el principio de Interface Segregation (ISP),
 * esta interfaz define únicamente el contrato necesario
 * para obtener tasas de cambio del BCV.
 */
export interface IBCVService {
  /**
   * Obtiene la tasa de cambio actual del BCV
   * @returns Promise con los datos de la tasa o null si falla
   */
  getCurrentRate(): Promise<BCVRateData | null>;
}
