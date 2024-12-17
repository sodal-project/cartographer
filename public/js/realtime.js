export class Realtime {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.messageQueue = [];
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.heartbeatInterval = null;
    this.connect();
  }

  connect() {
    if (this.connectionState === 'connecting') return;
    
    this.connectionState = 'connecting';
    this.ws = new WebSocket(`ws://${location.host}/ws`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.setupHeartbeat();
      
      // Resubscribe existing subscriptions
      this.subscribers.forEach((_, key) => {
        const [moduleId, instanceId] = key.split(':');
        this.sendSubscription(moduleId, instanceId);
      });

      // Process queued messages
      this.processMessageQueue();
    };
    
    this.ws.onmessage = (event) => {
      const { moduleId, instanceId, data } = JSON.parse(event.data);
      this.notifySubscribers(moduleId, instanceId, data);
    };

    this.ws.onclose = () => {
      this.connectionState = 'disconnected';
      this.clearHeartbeat();
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connectionState = 'error';
    };
  }

  setupHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  reconnect() {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  sendMessage(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      this.messageQueue.push(message);
      return false;
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  sendSubscription(moduleId, instanceId) {
    return this.sendMessage({
      type: 'subscribe',
      module: moduleId,
      instance: instanceId
    });
  }

  subscribe(moduleId, instanceId, callback) {
    const key = `${moduleId}:${instanceId}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
      this.sendSubscription(moduleId, instanceId);
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

export const realtime = new Realtime();