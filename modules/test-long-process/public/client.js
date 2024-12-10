class TestLongProcessModule extends window.CoreClientModule {
  static moduleName = 'test-long-process';

  async init() {
    // Get initial state
    const initialState = await this.fetchInitialState();
    
    this.shadowRoot.innerHTML = `
      <div class="p-8" style="max-width: 640px">
        <h2 class="text-xl font-bold mb-4 text-white">Test Long Process</h2>
        
        <div class="bg-gray-800 rounded-lg p-6">
          <form class="flex items-end gap-6 mb-0">
            <button
              class="bg-indigo-600 p-1 px-6 rounded text-white text-sm hover:bg-indigo-500"
              type="submit"
              ${initialState.status === 'running' ? 'disabled' : ''}
            >
              Start Process
            </button>
            <div>
              <p class="text-white">${initialState.status === 'running' ? 'Process running...' : 'Ready'}</p>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.shadowRoot.querySelector('form');
    const button = form.querySelector('button');
    const status = form.querySelector('p');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (button.disabled) return;

      // Update UI
      button.disabled = true;
      status.textContent = 'Process running...';
      
      try {
        await fetch(`/mod/${this.constructor.moduleName}/longProcess`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instanceId: this.instanceId
          })
        });
      } catch (error) {
        console.error('Error:', error);
        button.disabled = false;
        status.textContent = 'Error occurred';
      }
    });

    // Subscribe to state changes
    this.subscribe(data => {
      if (data.status === 'ready') {
        button.disabled = false;
        status.textContent = 'Ready';
      } else if (data.status === 'running') {
        button.disabled = true;
        status.textContent = 'Process running...';
      }
    });
  }
}

window.CoreClientModule.define(TestLongProcessModule);
