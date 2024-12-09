import { CoreClientModule } from './CoreClientModule.js';
import { realtime } from './realtime.js';

// Export core functionality
window.CoreClientModule = CoreClientModule;
window.realtime = realtime;

// Module Management
class ModuleManager {
  constructor() {
    this.currentModule = null;
    this.setupListeners();
    console.log('ModuleManager initialized');
  }

  setupListeners() {
    // Listen for module navigation clicks
    document.addEventListener('click', async (event) => {
      const moduleLink = event.target.closest('[data-module]');
      if (!moduleLink) return;

      event.preventDefault();
      
      const moduleId = moduleLink.dataset.module;
      if (moduleId === this.currentModule) return;

      // Show loading state
      document.getElementById('spinner').style.visibility = 'visible';
      document.getElementById('main').style.visibility = 'hidden';

      try {
        // First load the module's client code
        await this.loadModuleScript(moduleId);
        
        // Then fetch and render module content
        const response = await fetch(`/mod/${moduleId}/mainPane/`);
        const html = await response.text();
        
        // Update URL
        history.pushState({}, '', `/${moduleId}/mainPane/`);
        
        // Update content after web component is defined
        const main = document.getElementById('main');
        main.innerHTML = html;
        
        this.currentModule = moduleId;
      } catch (error) {
        console.error('Error loading module:', error);
      } finally {
        // Hide loading state
        document.getElementById('spinner').style.visibility = 'hidden';
        document.getElementById('main').style.visibility = 'visible';
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', async () => {
      const moduleId = window.location.pathname.split('/')[1];
      if (moduleId && moduleId !== this.currentModule) {
        await this.loadModule(moduleId);
      }
    });
  }

  async loadModuleScript(moduleId) {
    try {
      // Import the module's client code
      await import(`/public/${moduleId}/client.js`);
      console.log(`Loaded module script: ${moduleId}`);
    } catch (error) {
      console.error(`Error loading module script: ${moduleId}`, error);
      throw error;
    }
  }

  async loadModule(moduleId) {
    document.getElementById('spinner').style.visibility = 'visible';
    document.getElementById('main').style.visibility = 'hidden';

    try {
      // Load script first
      await this.loadModuleScript(moduleId);
      
      // Then fetch and render content
      const response = await fetch(`/mod/${moduleId}/mainPane/`);
      const html = await response.text();
      
      document.getElementById('main').innerHTML = html;
      this.currentModule = moduleId;
    } finally {
      document.getElementById('spinner').style.visibility = 'hidden';
      document.getElementById('main').style.visibility = 'visible';
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  window.moduleManager = new ModuleManager();
});
