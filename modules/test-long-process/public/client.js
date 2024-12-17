class TestLongProcessModule extends window.CoreClientModule {
  static moduleName = 'test-long-process';

  updateUI(state) {
    this.renderComponent({
      html: `
        <div class="p-4">
          <h2 class="text-xl mb-4 text-white">Long Process Test</h2>
          
          <div class="mb-4">
            <button id="start-btn" 
              class="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded text-white"
              ${state.status === 'running' ? 'disabled' : ''}>
              Start Process
            </button>
          </div>

          <div class="bg-gray-800 rounded p-4">
            ${state.status === 'running' ? `
              <div class="text-white mb-2">Process running...</div>
              <div class="bg-gray-700 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full transition-all" 
                  style="width: 100%">
                </div>
              </div>
            ` : `
              <div class="text-gray-400">
                Process not running
              </div>
            `}
          </div>
        </div>
      `
    });
  }
  
  setupEvents() {
    const startBtn = this.shadowRoot.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        console.log('Starting long process');
        try {
          await this.call({
            method: 'longProcess'
          });
        } catch (error) {
          console.error('Long process error:', error);
        }
      });
    }
  }
}

window.CoreClientModule.define(TestLongProcessModule);
