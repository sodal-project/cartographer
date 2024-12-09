import { realtime } from './realtime.js';

// core/client/CoreClientModule.js
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
    if (!moduleClass.moduleName) {
      throw new Error('Module class must define static moduleName');
    }
    customElements.define(moduleClass.tagName, moduleClass);
  }

  /**
   * Initialize a new instance of this component
   * @param {string} instanceId 
   */
  static initInstance(instanceId) {
    if (!this.moduleName) {
      throw new Error('Module class must define static moduleName');
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
  async connectedCallback() {
    this.instanceId = this.getAttribute('id');
    if (!this.instanceId) {
      throw new Error('Component must have an id attribute');
    }

    // Create shadow root if not already created
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    // Load and adopt Tailwind styles if not already loaded
    if (!tailwindStyles) {
      try {
        tailwindStyles = new CSSStyleSheet();
        const cssText = await window.getTailwindCSS();
        await tailwindStyles.replace(cssText);
      } catch (error) {
        console.error('Error loading Tailwind styles:', error);
      }
    }

    // Combine Tailwind and module-specific styles
    const stylesheets = [tailwindStyles];

    // Automatically load module styles if they exist
    try {
      const moduleStyles = new CSSStyleSheet();
      const response = await fetch(`/public/${this.constructor.moduleName}/css/styles.css`);
      if (response.ok) {
        const cssText = await response.text();
        await moduleStyles.replace(cssText);
        stylesheets.push(moduleStyles);
      }
    } catch (error) {
      // Silently fail if module styles don't exist
      console.debug(`No custom styles found for module ${this.constructor.moduleName}`);
    }

    // Adopt the stylesheets
    this.shadowRoot.adoptedStyleSheets = stylesheets;

    // Initialize the component
    await this.init();
  }

  /**
   * Subscribe to state updates for this instance
   */
  subscribe(callback) {
    console.log(`Subscribing to updates for ${this.constructor.moduleName}:${this.instanceId}`); // Debug log
    
    // Connect to WebSocket if not already connected
    if (!window.realtime) {
      console.error('Realtime service not initialized');
      return;
    }

    // Subscribe to updates for this instance
    return window.realtime.subscribe(
      this.constructor.moduleName,
      this.instanceId,
      (data) => {
        console.log('Received WebSocket data:', data); // Debug log
        callback(data);
      }
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
        `/mod/${this.constructor.moduleName}/getData?instance=${this.instanceId}`
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