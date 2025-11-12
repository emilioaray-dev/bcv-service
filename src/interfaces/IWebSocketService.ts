import { RateUpdateEvent } from '@/models/rate';

/**
 * Interface for WebSocket service
 *
 * Siguiendo el principio de Interface Segregation (ISP),
 * esta interfaz define el contrato para broadcasting de eventos
 * a clientes conectados via WebSocket.
 */
export interface IWebSocketService {
  /**
   * Transmite una actualización de tasa a todos los clientes conectados
   * @param rateUpdate - Evento con la actualización de tasa
   */
  broadcastRateUpdate(rateUpdate: RateUpdateEvent): void;

  /**
   * Obtiene el número de clientes WebSocket conectados
   * @returns Número de clientes activos
   */
  getConnectedClientsCount(): number;
}
