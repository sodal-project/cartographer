import { WebSocket, WebSocketServer } from 'ws';

class CoreServerModule {
  constructor(name) {
    this.name = name;
  }

  // Helper method to safely serialize data for components
  _serializeProps(props) {
    return Object.entries(props)
      .map(([key, value]) => {
        const safeValue = JSON.stringify(value)
          .replace(/&/g, '&amp;')
          .replace(/'/g, '&apos;')
          .replace(/"/g, '&quot;');
        return `${key}="${safeValue}"`;
      })
      .join(' ');
  }

  // Template helper that modules can use
  renderComponent(name, props = {}, options = {}) {
    const {
      scripts = [],
      styles = [],
    } = options;

    // Add default module assets if they exist
    const defaultAssets = [
      `/public/${this.name}/css/styles.css`,
      `/public/${this.name}/js/client.js`
    ];

    const cssLinks = [...defaultAssets.filter(p => p.endsWith('.css')), ...styles]
      .map(href => `<link rel="stylesheet" href="${href}">`)
      .join('\n');

    const scriptTags = [...defaultAssets.filter(p => p.endsWith('.js')), ...scripts]
      .map(src => `<script type="module" src="${src}"></script>`)
      .join('\n');

    return `
      ${cssLinks}
      ${scriptTags}
      <${name} ${this._serializeProps(props)}></${name}>
    `;
  }

  // Default entry point for module UI
  async mainPane(req) {
    throw new Error('mainPane not implemented');
  }

  // Helper to update connected clients
  async update(instanceId, data) {
    realtime.broadcast(this.name, instanceId, data);
  }
}

class RealtimeService {
  constructor() {
    this.clients = new Set();
    this.subscriptions = new Map();
  }

  init(server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('Client connected to WebSocket');
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'subscribe') {
            console.log(`Subscribing to ${data.module}:${data.instance}`);
            this.subscribe(ws, data.module, data.instance);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
        this.unsubscribeAll(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  subscribe(client, moduleId, instanceId) {
    const key = `${moduleId}:${instanceId}`;
    console.log(`Adding client subscription for ${key}`);
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key).add(client);
    console.log(`Current subscriptions for ${key}: ${this.subscriptions.get(key).size}`);
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
    
    const message = JSON.stringify({
      moduleId,
      instanceId,
      data
    });

    console.log(`Broadcasting to ${clients.size} clients for ${key}:`, data);

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    });
  }
}

export const realtime = new RealtimeService();

// Export class and functions separately
export default {
  CoreServerModule,
  realtime
};