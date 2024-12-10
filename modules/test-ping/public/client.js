class TestPingModule extends window.CoreClientModule {
  static moduleName = 'test-ping';

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
    this.shadowRoot.innerHTML = `
      <div class="p-8" style="max-width: 640px">
        <h2 class="text-xl font-bold mb-4 text-white">Test Ping</h2>
        
        <div class="bg-gray-800 rounded-lg p-6">
          <form class="flex items-end gap-6 mb-0">
            <button
              class="bg-indigo-600 p-1 px-6 rounded text-white text-sm hover:bg-indigo-500"
              type="submit"
            >
              Ping
            </button>
            <div>
              <p class="text-white">Pings: ${state.pings}</p>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.shadowRoot.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await fetch(`/mod/${this.constructor.moduleName}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: this.instanceId })
      });
    });
  }
}

if (window.CoreClientModule) {
  window.CoreClientModule.define(TestPingModule);
} else {
  console.error('CoreClientModule not loaded');
} 