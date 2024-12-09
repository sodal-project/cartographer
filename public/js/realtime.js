
// core/client/realtime.js
class ClientRealtimeService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`ws://${location.host}/ws`);
    
    this.ws.onmessage = (event) => {
      const { moduleId, instanceId, data } = JSON.parse(event.data);
      this.notifySubscribers(moduleId, instanceId, data);
    };

    this.ws.onclose = () => {
      // Reconnect after delay
      setTimeout(() => this.connect(), 1000);
    };
  }

  subscribe(moduleId, instanceId, callback) {
    const key = `${moduleId}:${instanceId}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
      
      // Notify server of subscription
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          moduleId,
          instanceId
        }));
      }
    }
    
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  notifySubscribers(moduleId, instanceId, data) {
    const key = `${moduleId}:${instanceId}`;
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

export const realtime = new ClientRealtimeService();