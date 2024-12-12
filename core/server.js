import { WebSocket, WebSocketServer } from 'ws';

class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
    this.heartbeatTimeout = 35000; // Slightly longer than client interval
  }

  init(server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      
      // Setup connection state
      ws.isAlive = true;
      ws.subscriptions = new Set();

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'ping') {
            ws.isAlive = true;
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          if (data.type === 'subscribe') {
            this.subscribe(ws, data.module, data.instance);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.unsubscribeAll(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.unsubscribeAll(ws);
      });
    });

    // Setup heartbeat checking
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          console.log('Terminating inactive WebSocket connection');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, this.heartbeatTimeout);
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