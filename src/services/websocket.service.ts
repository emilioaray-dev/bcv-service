import { injectable, inject } from 'inversify';
import { Server as WebSocketServer, WebSocket } from 'ws';
import { RateUpdateEvent } from '@/models/rate';
import log from '@/utils/logger';
import { IWebSocketService } from '@/interfaces/IWebSocketService';
import { TYPES } from '@/config/types';
import type { Server as HttpServer } from 'http';

/**
 * WebSocketService - Servicio de comunicación en tiempo real
 *
 * Implementa el principio de Single Responsibility (SRP):
 * - Responsabilidad única: Gestionar conexiones WebSocket y broadcast
 *
 * Implementa el principio de Dependency Inversion (DIP):
 * - Implementa la interfaz IWebSocketService (abstracción)
 * - Depende del servidor HTTP a través de inyección
 */
@injectable()
export class WebSocketService implements IWebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(
    @inject(TYPES.HttpServer) server: HttpServer
  ) {
    this.wss = new WebSocketServer({ server });
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      log.info('Cliente WebSocket conectado', {
        totalClients: this.clients.size
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        log.info('Cliente WebSocket desconectado', {
          totalClients: this.clients.size
        });
      });
    });
  }

  broadcastRateUpdate(rateUpdate: RateUpdateEvent): void {
    const message = JSON.stringify(rateUpdate);

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
        sentCount++;
      }
    });

    log.debug('Actualización de tasa transmitida por WebSocket', {
      eventType: rateUpdate.eventType,
      rate: rateUpdate.rate,
      clientsSent: sentCount,
      totalClients: this.clients.size
    });
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}