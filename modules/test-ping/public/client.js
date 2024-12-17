class TestPingModule extends window.CoreClientModule {
  static moduleName = 'test-ping';

  updateUI(state) {
    this.renderComponent({
      html: `
        <div class="p-4">
          <h2 class="text-xl mb-4 text-white">Ping Test</h2>
          
          <div class="mb-4">
            <button id="ping-btn" 
              class="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded text-white">
              Send Ping
            </button>
          </div>

          <div class="bg-gray-800 rounded p-4">
            <div class="text-gray-400">
              Pings: ${state?.pings || 0}
            </div>
          </div>
        </div>
      `
    });
  }

  setupEvents() {
    const pingBtn = this.shadowRoot.getElementById('ping-btn');
    if (pingBtn) {
      pingBtn.addEventListener('click', () => {
        this.call({ method: 'ping' });
      });
    }
  }
}

window.CoreClientModule.define(TestPingModule); 