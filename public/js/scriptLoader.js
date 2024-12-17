/**
 * Utility for handling script loading and execution
 */
export class ScriptLoader {
  /**
   * Extract scripts from HTML content
   * @param {Element} container - DOM element containing scripts
   * @returns {Array} Array of script objects with their properties
   */
  static extractScripts(container) {
    const scripts = container.querySelectorAll('script');
    return Array.from(scripts).map(script => ({
      content: script.textContent,
      src: script.src,
      type: script.type,
      attributes: Array.from(script.attributes)
    }));
  }

  /**
   * Execute a collection of scripts
   * @param {Array} scriptConfigs - Array of script configuration objects
   * @returns {Promise} Resolves when all scripts have executed
   */
  static async executeScriptConfigs(scriptConfigs) {
    for (const script of scriptConfigs) {
      if (script.src) {
        // Handle external scripts
        await new Promise((resolve, reject) => {
          const newScript = document.createElement('script');
          
          // Copy all original attributes
          script.attributes.forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          
          newScript.onload = resolve;
          newScript.onerror = reject;
          document.head.appendChild(newScript);
        });
      } else {
        // Handle inline scripts
        const newScript = document.createElement('script');
        newScript.type = script.type || 'text/javascript';
        newScript.textContent = script.content;
        document.head.appendChild(newScript);
      }
    }
  }

  /**
   * Execute scripts found in HTML content
   * @param {string|Element} content - HTML content or element containing scripts
   * @returns {Promise} Resolves when all scripts have executed
   */
  static async executeScripts(content) {
    // Create temporary container if string provided
    const container = typeof content === 'string' 
      ? (() => {
          const temp = document.createElement('div');
          temp.innerHTML = content;
          return temp;
        })()
      : content;

    // Extract and execute scripts
    const scriptConfigs = this.extractScripts(container);
    await this.executeScriptConfigs(scriptConfigs);
  }
} 