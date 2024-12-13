import { ComponentLoader } from './componentLoader.js';

// Create a shared stylesheet that can be reused across all modules
let tailwindStyles = null;

export class CoreClientModule extends HTMLElement {
  static instances = new Map();

  static get tagName() {
    return `${this.moduleName}-module`;
  }

  /**
   * Define the custom element for this module
   * @param {typeof CoreClientModule} moduleClass - The module class to define
   */
  static define(moduleClass) {
    customElements.define(`${moduleClass.moduleName}-module`, moduleClass);
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = null;
    this._eventListeners = new Map();
  }

  addEventListener(eventType, selectorOrHandler, optionalHandler) {
    // Determine if we're using delegation or direct event handling
    const selector = typeof selectorOrHandler === 'string' ? selectorOrHandler : null;
    const handler = typeof selectorOrHandler === 'function' ? selectorOrHandler : optionalHandler;

    // Remove existing listener for this event type + selector combination
    const key = `${eventType}:${selector || ''}`;
    if (this._eventListeners.has(key)) {
      this.shadowRoot.removeEventListener(
        eventType, 
        this._eventListeners.get(key)
      );
    }

    // Create the delegated event handler
    const delegatedHandler = (e) => {
      if (selector) {
        const target = e.target.closest(selector);
        if (target) {
          handler.call(this, e, target);
        }
      } else {
        handler.call(this, e);
      }
    };

    // Store and add the new listener
    this._eventListeners.set(key, delegatedHandler);
    this.shadowRoot.addEventListener(eventType, delegatedHandler);
  }

  /**
   * Standard Web Component lifecycle - called when component is added to DOM
   */
  async connectedCallback() {
    // Get instance ID from element attribute
    this.instanceId = this.getAttribute('id');
    
    // Simplify instance tracking
    if (!this.constructor.instances.has(this.instanceId)) {
      this.constructor.instances.set(this.instanceId, this);
    }

    // Load and apply Tailwind styles
    if (!tailwindStyles) {
      try {
        tailwindStyles = new CSSStyleSheet();
        await tailwindStyles.replace(await window.getTailwindCSS());
      } catch (error) {
        console.error('Error loading Tailwind styles:', error);
      }
    }
    this.shadowRoot.adoptedStyleSheets = [tailwindStyles];

    // Load module-specific styles if they exist
    try {
      const response = await fetch(`/public/${this.constructor.moduleName}/styles.css`);
      if (response.ok && response.headers.get('content-type')?.includes('text/css')) {
        const moduleStyles = new CSSStyleSheet();
        await moduleStyles.replace(await response.text());
        this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, moduleStyles];
      }
    } catch (error) {}

    // Load module client code if needed
    if (!customElements.get(this.constructor.tagName)) {
      try {
        await import(`/public/${this.constructor.moduleName}/client.js`);
      } catch (error) {
        console.error(`Error loading module client code:`, error);
      }
    }

    await this.subscribe(state => {
      this.state = state;
      this.updateUI(state);
    });

    // Get initial state from server
    try {
      // call broadcastState
      const response = await this.call({});
      console.log('Initial state response:', response);
    } catch (error) {
      console.error('Error fetching initial state:', error);
    }
  }

  /**
   * Subscribe to state updates for this instance
   */
  subscribe(callback) {
    console.log(`Subscribing to updates for ${this.constructor.moduleName}:${this.instanceId}`);
    
    if (!window.realtime) {
      console.error('Realtime service not initialized');
      return;
    }

    return window.realtime.subscribe(
      this.constructor.moduleName,
      this.instanceId,
      callback
    );
  }

  /**
   * Render component content with automatic event handling
   * @param {Object} options - Render options
   * @param {string} options.html - HTML content to render
   * @param {boolean} options.setupEvents - Whether to call setupEvents (defaults to true)
   */
  renderComponent({ html }) {
    this.shadowRoot.innerHTML = html;
    this.setupEvents();
  }

  /**
   * Setup event handlers - override in subclass if needed
   */
  setupEvents() {
    // Override in subclass
  }

  /**
   * Standard Web Component lifecycle - called when component is removed from DOM
   */
  disconnectedCallback() {
    this.constructor.instances.delete(this.instanceId);
  }

  /**
   * Render a submodule
   * @param {Object} options - Render options
   * @param {string} options.module - Module name to render
   * @param {string} options.mountId - ID of mount point element
   * @param {string} options.action - Action to call (defaults to 'index')
   * @param {string} options.instanceId - Instance ID for the submodule
   */
  async renderSubmodule({ module, mountId, action = 'index', instanceId }) {
    const mountPoint = this.shadowRoot.getElementById(mountId);
    
    if (!mountPoint) {
      throw new Error(`Mount point with ID "${mountId}" not found`);
    }

    await ComponentLoader.load({
      module,
      instanceId,
      container: mountPoint,
      action
    });
  }

  /**
   * Update UI with new state - must be implemented by subclass
   * @param {Object} state - New state to render
   */
  updateUI(state) {
    throw new Error('updateUI must be implemented');
  }

  /**
   * Call a server module method
   * @param {Object} options - Call options
   * @param {string} options.module - Target module name (optional, defaults to current module)
   * @param {string} options.method - Method to call
   * @param {Object} options.params - Parameters to pass to the method
   */
  async call({ 
    module = this.constructor.moduleName, 
    method = 'broadcastState', 
    instanceId = this.instanceId, 
    params = {} 
  }) {
    try {
      const response = await fetch(`/mod/${module}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          ...params
        })
      });
      return await response.json();
    } catch (error) {
      console.error(`Error calling ${module}/${method}:`, error);
      throw error;
    }
  }
}