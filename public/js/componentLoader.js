import { ScriptLoader } from './scriptLoader.js';

/**
 * Handles loading and initialization of components at any level
 */
export class ComponentLoader {
  /**
   * Load a component into a container
   * @param {Object} options - Loading options
   * @param {string} options.module - Module name to load
   * @param {string} options.instanceId - Instance ID for the component
   * @param {Element} options.container - Container element to load into
   * @param {string} options.action - Action to call (defaults to 'index')
   * @param {Object} options.params - Additional parameters to pass to the request
   * @returns {Promise<void>}
   */
  static async load({ 
    module, 
    instanceId, 
    container, 
    action = 'index',
    params = {} 
  }) {
    try {
      // Fetch component HTML
      const response = await fetch(`/mod/${module}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, ...params })
      });

      if (!response.ok) {
        throw new Error(`Failed to load ${module}: ${response.statusText}`);
      }

      const html = await response.text();

      // Create temp container and extract scripts
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const scriptConfigs = ScriptLoader.extractScripts(temp);

      // Update container content
      container.innerHTML = html;

      // Initialize component if mount point exists
      const componentMount = container.querySelector('[id^="component-mount-"]');
      if (componentMount) {
        const component = document.createElement(`${module}-module`);
        component.id = instanceId;
        
        if (componentMount.parentNode) {
          componentMount.parentNode.replaceChild(component, componentMount);
        }
      }

      // Execute extracted scripts
      await ScriptLoader.executeScriptConfigs(scriptConfigs);

    } catch (error) {
      console.error(`Failed to load ${module}:`, error);
      container.innerHTML = `
        <div class="p-4 text-red-500">
          Failed to load ${module}: ${error.message}
        </div>
      `;
      throw error;
    }
  }
} 