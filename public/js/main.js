// Import core dependencies
import { CoreClientModule } from './CoreClientModule.js';
import { realtime } from './realtime.js';
import { ScriptLoader } from './scriptLoader.js';

// Expose core dependencies globally
window.CoreClientModule = CoreClientModule;
window.realtime = realtime;

/**
 * Core application functionality for module management and navigation
 */
class App {
  constructor() {
    // Core state
    this.currentModule = null;
    this.isLoading = false;

    // Cache DOM elements
    this.elements = {
      main: document.getElementById('main'),
      spinner: document.getElementById('spinner'),
      nav: document.querySelector('nav')
    };

    // Initialize
    this.setupEventListeners();
    this.initializeFromURL();
  }

  /**
   * Set up core event listeners
   */
  setupEventListeners() {
    // Module navigation clicks
    this.elements.nav.addEventListener('click', e => {
      const moduleLink = e.target.closest('[data-module]');
      if (!moduleLink) return;
      
      e.preventDefault();
      const moduleId = moduleLink.dataset.module;
      if (moduleId !== this.currentModule) {
        this.loadModule(moduleId);
      }
    });

    // Browser back/forward navigation
    window.addEventListener('popstate', () => {
      const moduleId = this.getModuleFromURL();
      if (moduleId && moduleId !== this.currentModule) {
        this.loadModule(moduleId);
      }
    });
  }

  /**
   * Initialize app state from current URL
   */
  initializeFromURL() {
    const moduleId = this.getModuleFromURL();
    if (moduleId) {
      this.loadModule(moduleId);
    }
  }

  /**
   * Extract module ID from current URL
   */
  getModuleFromURL() {
    return window.location.pathname.split('/')[1];
  }

  /**
   * Show/hide loading state
   */
  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.elements.spinner.style.display = isLoading ? 'block' : 'none';
    this.elements.main.style.opacity = isLoading ? '0.5' : '1';
  }

  /**
   * Update URL and history state
   */
  updateURL(moduleId) {
    const url = `/${moduleId}/index/`;
    history.pushState({ moduleId }, '', url);
  }

  /**
   * Execute scripts within HTML content
   */
  async executeScripts(container) {
    // Get all scripts from the container
    const scripts = container.querySelectorAll('script');
    
    for (const oldScript of scripts) {
      const newScript = document.createElement('script');
      
      // Copy all attributes
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Handle both inline and external scripts
      if (oldScript.src) {
        newScript.src = oldScript.src;
        // Wait for external scripts to load
        await new Promise((resolve, reject) => {
          newScript.onload = resolve;
          newScript.onerror = reject;
        });
      } else {
        newScript.textContent = oldScript.textContent;
      }

      // Replace old script with new one
      oldScript.parentNode.replaceChild(newScript, oldScript);
    }
  }

  async loadModule(moduleId) {
    if (this.isLoading) return;
    
    this.setLoading(true);

    try {
      const response = await fetch(`/mod/${moduleId}/index/`);
      
      if (!response.ok) {
        throw new Error(`Failed to load module: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Update state and UI
      this.currentModule = moduleId;
      this.elements.main.innerHTML = html;
      
      // Execute scripts using shared utility
      await ScriptLoader.executeScripts(this.elements.main);
      
      this.updateURL(moduleId);
      this.updateNavigation(moduleId);

    } catch (error) {
      console.error('Error loading module:', error);
      this.elements.main.innerHTML = `
        <div class="p-4 text-red-500">
          Failed to load module. Please try again.
        </div>
      `;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Update navigation active states
   */
  updateNavigation(activeModuleId) {
    // Remove all active indicators
    this.elements.nav.querySelectorAll('.bg-indigo-600').forEach(el => {
      el.remove();
    });

    // Add active indicator to current module
    const activeLink = this.elements.nav.querySelector(`[data-module="${activeModuleId}"]`);
    if (activeLink) {
      const indicator = document.createElement('span');
      indicator.className = 'absolute -left-4 top-0 h-full w-1.5 bg-indigo-600';
      activeLink.appendChild(indicator);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
