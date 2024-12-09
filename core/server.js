import { WebSocketServer } from 'ws';

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
    this.moduleGraph = new Map();
    this.instanceRelations = new Map();
    this.wsConnections = new Map();
  }

  registerModule(module) {
    this.moduleGraph.set(module.name, {
      module,
      children: new Set(),
      parent: null
    });
  }

  trackRelationship(parentModule, childModule, parentId, childId) {
    const parent = this.moduleGraph.get(parentModule);
    if (parent) {
      parent.children.add(childModule);
    }

    // Store the instance relationship
    const key = `${parentModule}:${parentId}`;
    if (!this.instanceRelations.has(key)) {
      this.instanceRelations.set(key, new Set());
    }
    this.instanceRelations.get(key).add(`${childModule}:${childId}`);
  }

  handleConnection(ws) {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'subscribe') {
          const key = `${data.module}:${data.instance}`;
          if (!this.wsConnections.has(key)) {
            this.wsConnections.set(key, new Set());
          }
          this.wsConnections.get(key).add(ws);
        }
      } catch (err) {
        console.error('Error handling websocket message:', err);
      }
    });

    ws.on('close', () => {
      // Remove this connection from all subscriptions
      for (const [key, connections] of this.wsConnections.entries()) {
        connections.delete(ws);
        if (connections.size === 0) {
          this.wsConnections.delete(key);
        }
      }
    });
  }

  broadcast(moduleName, instanceId, data) {
    const key = `${moduleName}:${instanceId}`;
    const connections = this.wsConnections.get(key);
    
    if (connections) {
      const message = JSON.stringify({
        module: moduleName,
        instance: instanceId,
        data
      });

      connections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
}

// Create singleton instance
const realtime = new RealtimeService();

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    realtime.handleConnection(ws);
  });
  return wss;
}

// Export class and functions separately
export default {
  CoreServerModule,
  realtime,
  setupWebSocket
};