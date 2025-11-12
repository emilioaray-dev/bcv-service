import { Server as WebSocketServer, WebSocket } from 'ws';
import { RateUpdateEvent } from '../models/rate';
import log from '../utils/logger';

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: any) {
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