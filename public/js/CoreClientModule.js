import { realtime } from './realtime.js';

// core/client/CoreClientModule.js
export class CoreClientModule extends HTMLElement {
  static instances = new Map();

  /**
   * Initialize a new instance of this component
   * @param {string} instanceId 
   */
  static initInstance(instanceId) {
    if (!customElements.get(this.tagName)) {
      customElements.define(this.tagName, this);
    }
    
    if (!this.instances.has(instanceId)) {
      this.instances.set(instanceId, {
        state: new Map(),
        subscribers: new Set()
      });
    }
  }

  constructor() {
    super();
    this.instanceId = '';
    this.state = null;
  }

  /**
   * Standard Web Component lifecycle - called when component is added to DOM
   */
  connectedCallback() {
    // Get instance ID from element ID
    this.instanceId = this.id.split('-').pop();
    
    // Get or create instance state
    this.state = this.constructor.instances.get(this.instanceId);
    
    // Connect to realtime updates
    this.connectRealtime();
    
    // Initialize component
    this.init();
  }

  /**
   * Connect to realtime update system
   */
  async connectRealtime() {
    realtime.subscribe(
      this.tagName.toLowerCase(),
      this.instanceId,
      (data) => this.handleUpdate(data)
    );
  }

  /**
   * Initialize component - override in subclass
   */
  async init() {
    // Load initial state
    const data = await this.fetchInitialState();
    this.setState(data);
    
    // Setup event handlers
    this.setupEvents();
    
    // Initial render
    this.render();
  }

  /**
   * Fetch initial state from server
   */
  async fetchInitialState() {
    try {
      const response = await fetch(
        `/mod/${this.tagName.toLowerCase()}/getData?instance=${this.instanceId}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching initial state:', error);
      return {};
    }
  }

  /**
   * Handle updates from server
   * @param {Object} data 
   */
  async handleUpdate(data) {
    this.setState(data);
    this.render();
  }

  /**
   * Update component state
   * @param {Object} newState 
   */
  setState(newState) {
    this.state = newState;
    this.constructor.instances.get(this.instanceId).state = newState;
    
    // Notify subscribers
    const subscribers = this.constructor.instances.get(this.instanceId).subscribers;
    subscribers.forEach(callback => callback(newState));
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback 
   */
  subscribe(callback) {
    const subscribers = this.constructor.instances.get(this.instanceId).subscribers;
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  /**
   * Emit event to parent components
   * @param {string} eventName 
   * @param {Object} data 
   */
  emit(eventName, data) {
    const event = new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail: {
        instanceId: this.instanceId,
        data
      }
    });
    this.dispatchEvent(event);
  }

  /**
   * Setup event handlers - override in subclass
   */
  setupEvents() {
    // Override in subclass
  }

  /**
   * Render component - override in subclass
   */
  render() {
    // Override in subclass
  }

  /**
   * Standard Web Component lifecycle - called when component is removed from DOM
   */
  disconnectedCallback() {
    // Cleanup if no more references to this instance exist
    if (!document.getElementById(this.id)) {
      this.constructor.instances.delete(this.instanceId);
    }
  }
}