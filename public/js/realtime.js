// core/client/realtime.js
class ClientRealtimeService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.connect();
    console.log('Realtime service initialized'); // Debug log
  }

  connect() {
    this.ws = new WebSocket(`ws://${location.host}/ws`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected, resubscribing existing subscriptions');
      
      // Resubscribe existing subscriptions
      this.subscribers.forEach((_, key) => {
        const [moduleId, instanceId] = key.split(':');
        console.log(`Resubscribing to ${moduleId}:${instanceId}`);
        this.sendSubscription(moduleId, instanceId);
      });
    };
    
    this.ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data); // Debug log
      const { moduleId, instanceId, data } = JSON.parse(event.data);
      this.notifySubscribers(moduleId, instanceId, data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...'); // Debug log
      setTimeout(() => this.connect(), 1000);
    };
  }

  sendSubscription(moduleId, instanceId) {
    if (this.ws.readyState === WebSocket.OPEN) {
      const subscribeMsg = {
        type: 'subscribe',
        module: moduleId,
        instance: instanceId
      };
      console.log('Sending subscription:', subscribeMsg);
      this.ws.send(JSON.stringify(subscribeMsg));
    } else {
      console.warn('WebSocket not ready, subscription will be sent when connected');
    }
  }

  subscribe(moduleId, instanceId, callback) {
    const key = `${moduleId}:${instanceId}`;
    console.log(`Setting up subscription for ${key}`);
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
      this.sendSubscription(moduleId, instanceId);
    }
    
    this.subscribers.get(key).add(callback);
    
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
    console.log(`Notifying subscribers for ${key}:`, data); // Debug log
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

export const realtime = new ClientRealtimeService();