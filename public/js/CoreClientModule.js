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
  }

  /**
   * Standard Web Component lifecycle - called when component is added to DOM
   */
  async connectedCallback() {
    // Get instance ID from element attribute
    this.instanceId = this.getAttribute('id');
    
    // Initialize instance state if not exists
    if (!this.constructor.instances.has(this.instanceId)) {
      this.constructor.instances.set(this.instanceId, {
        state: new Map(),
        subscribers: new Set()
      });
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

    // Set up subscription before getting initial state
    if (window.realtime) {
      this.subscribe(this.updateUI.bind(this));
    }

    // Get initial state
    try {
      const response = await fetch(`/mod/${this.constructor.moduleName}/getData`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: this.instanceId })
      });
      
      const initialState = await response.json();
      this.updateUI(initialState);
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
   * Setup event handlers - override in subclass if needed
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

  /**
   * Render a submodule
   * @param {Object} options - Render options
   * @param {string} options.module - Module name to render
   * @param {string} options.mountId - ID of mount point element
   * @param {string} options.action - Action to call (defaults to 'index')
   * @param {string} options.instanceId - Instance ID for the submodule
   */
  async renderSubmodule({ module, mountId, action = 'index', instanceId = crypto.randomUUID() }) {
    try {
      const response = await fetch(`/mod/${module}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instanceId })
      });
      
      const html = await response.text();
      const mountPoint = this.shadowRoot.getElementById(mountId);
      mountPoint.innerHTML = html;

      // Initialize the submodule's component
      const componentMount = mountPoint.querySelector('[id^="component-mount-"]');
      if (componentMount) {
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = `
          import '/public/${module}/client.js';
          const component = document.createElement('${module}-module');
          component.id = '${instanceId}';
          document.querySelector('${this.constructor.moduleName}-module')
            .shadowRoot.querySelector('#${mountId}')
            .replaceChild(component, document.querySelector('${this.constructor.moduleName}-module')
            .shadowRoot.querySelector('#${mountId}').firstChild);
        `;
        document.head.appendChild(script);
      }
    } catch (error) {
      console.error(`Failed to load ${module}:`, error);
      this.shadowRoot.getElementById(mountId).innerHTML = 
        `<p class="text-red-500">Failed to load ${module}</p>`;
    }
  }

  /**
   * Render component content
   * @param {Object} options - Render options
   * @param {string} options.html - HTML content to render
   * @param {boolean} options.setupEvents - Whether to call setupEvents (defaults to true)
   */
  renderComponent({ html, setupEvents = true }) {
    this.shadowRoot.innerHTML = html;
    if (setupEvents) {
      this.setupEvents();
    }
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
  async call({ module, method, params = {} }) {
    const targetModule = module || this.constructor.moduleName;

    try {
      const response = await fetch(`/mod/${targetModule}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: this.instanceId,
          ...params
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error(`Error calling ${targetModule}/${method}:`, error);
      throw error;
    }
  }
}