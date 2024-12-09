import { WebSocketServer } from 'ws';

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

    const key = `${childModule}:${childId}`;
    this.instanceRelations.set(key, {
      parentModule,
      parentId
    });
  }

  async propagateUpdate({ moduleId, instanceId, data }) {
    // 1. Notify WebSocket clients
    this.notifyClients(moduleId, instanceId, data);

    // 2. Find parent relationship
    const instanceKey = `${moduleId}:${instanceId}`;
    const relation = this.instanceRelations.get(instanceKey);

    // 3. If there's a parent, notify it
    if (relation) {
      const parentModule = this.moduleGraph.get(relation.parentModule);
      if (parentModule?.module) {
        await parentModule.module.onChildUpdate(
          moduleId,
          relation.parentId,
          data
        );
      }
    }
  }

  handleConnection(ws) {
    ws.on('message', (message) => {
      try {
        const { type, moduleId, instanceId } = JSON.parse(message);
        
        if (type === 'subscribe') {
          this.subscribeClient(ws, moduleId, instanceId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      this.removeClient(ws);
    });
  }

  subscribeClient(ws, moduleId, instanceId) {
    const key = `${moduleId}:${instanceId}`;
    if (!this.wsConnections.has(key)) {
      this.wsConnections.set(key, new Set());
    }
    this.wsConnections.get(key).add(ws);
  }

  removeClient(ws) {
    for (const [_, clients] of this.wsConnections) {
      clients.delete(ws);
    }
  }

  notifyClients(moduleId, instanceId, data) {
    const key = `${moduleId}:${instanceId}`;
    const clients = this.wsConnections.get(key);
    
    if (clients) {
      const message = JSON.stringify({
        moduleId,
        instanceId,
        data
      });

      clients.forEach(client => {
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

export default {
  realtime,
  setupWebSocket
};