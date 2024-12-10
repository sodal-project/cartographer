class TestLongProcessModule extends window.CoreClientModule {
  static moduleName = 'test-long-process';

  async init() {
    // Subscribe first to ensure no missed updates
    this.subscribe(state => this.updateUI(state));
    
    // Get initial state
    const response = await fetch(`/mod/${this.constructor.moduleName}/getData`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: this.instanceId })
    });
    
    const state = await response.json();
    this.updateUI(state);
  }

  updateUI(state) {
    this.renderComponent(`
      <div class="p-8" style="max-width: 640px">
        <h2 class="text-xl font-bold mb-4 text-white">Test Long Process</h2>
        
        <div class="bg-gray-800 rounded-lg p-6">
          <form class="flex items-end gap-6 mb-0">
            <button
              class="bg-indigo-600 p-1 px-6 rounded text-white text-sm hover:bg-indigo-500"
              type="submit"
              ${state.status === 'running' ? 'disabled' : ''}
            >
              Start Process
            </button>
            <div>
              <p class="text-white">Status: ${state.status}</p>
            </div>
          </form>
        </div>
      </div>
    `);
  }

  setupEvents() {
    const form = this.shadowRoot.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await fetch(`/mod/${this.constructor.moduleName}/longProcess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceId: this.instanceId })
        });
      } catch (error) {
        console.error('Error starting long process:', error);
      }
    });
  }
}

// Make sure this runs after CoreClientModule is available
if (window.CoreClientModule) {
  window.CoreClientModule.define(TestLongProcessModule);
} else {
  console.error('CoreClientModule not loaded');
}
