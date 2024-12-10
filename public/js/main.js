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
  }

  setupListeners() {
    // Listen for module navigation clicks
    document.addEventListener('click', async (event) => {
      const moduleLink = event.target.closest('[data-module]');
      if (!moduleLink) return;

      event.preventDefault();
      
      const moduleId = moduleLink.dataset.module;
      if (moduleId === this.currentModule) return;

      await this.loadModule(moduleId);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', async () => {
      const moduleId = window.location.pathname.split('/')[1];
      if (moduleId && moduleId !== this.currentModule) {
        await this.loadModule(moduleId);
      }
    });
  }

  async loadModule(moduleId) {
    document.getElementById('spinner').style.visibility = 'visible';
    document.getElementById('main').style.visibility = 'hidden';

    try {
      const response = await fetch(`/mod/${moduleId}/index/`);
      const html = await response.text();
      
      // Update URL
      history.pushState({}, '', `/${moduleId}/index/`);
      
      // Update content
      document.getElementById('main').innerHTML = html;
      this.currentModule = moduleId;
    } catch (error) {
      console.error('Error loading module:', error);
    } finally {
      document.getElementById('spinner').style.visibility = 'hidden';
      document.getElementById('main').style.visibility = 'visible';
    }
  }
}

class ModuleLoader {
  constructor() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const mounts = [
              ...(node.id?.startsWith('component-mount-') ? [node] : []),
              ...node.querySelectorAll('[id^="component-mount-"]')
            ];
            mounts.forEach(mount => this.initializeComponent(mount));
          }
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async initializeComponent(mountPoint) {
    const scripts = mountPoint.querySelectorAll('script[type="module"]');
    
    try {
      for (const script of scripts) {
        const newScript = document.createElement('script');
        newScript.type = 'module';
        
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        
        script.remove();
        
        await new Promise((resolve, reject) => {
          newScript.onload = resolve;
          newScript.onerror = reject;
          document.head.appendChild(newScript);
        });
      }
    } catch (error) {
      console.error('Error initializing component:', error);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.moduleManager = new ModuleManager();
  window.moduleLoader = new ModuleLoader();
});
