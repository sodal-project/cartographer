import { WebSocket, WebSocketServer } from 'ws';

class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
  }

  init(server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe') {
          this.subscribe(ws, data.module, data.instance);
        }
      });

      ws.on('close', () => {
        this.unsubscribeAll(ws);
      });
    });
  }

  subscribe(client, moduleId, instanceId) {
    const key = `${moduleId}:${instanceId}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key).add(client);
  }

  unsubscribeAll(client) {
    this.subscriptions.forEach((clients, key) => {
      clients.delete(client);
      if (clients.size === 0) {
        this.subscriptions.delete(key);
      }
    });
  }

  broadcast(moduleId, instanceId, data) {
    const key = `${moduleId}:${instanceId}`;
    const clients = this.subscriptions.get(key) || new Set();
    
    const message = JSON.stringify({ moduleId, instanceId, data });
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export const realtime = new RealtimeService();

// Export class and functions separately
export default {
  realtime
};