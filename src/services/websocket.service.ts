import { Server as WebSocketServer, WebSocket } from 'ws';
import { RateUpdateEvent } from '../models/rate';

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`Cliente WebSocket conectado. Total: ${this.clients.size}`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`Cliente WebSocket desconectado. Total: ${this.clients.size}`);
      });
    });
  }

  broadcastRateUpdate(rateUpdate: RateUpdateEvent): void {
    const message = JSON.stringify(rateUpdate);
    
    this.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}