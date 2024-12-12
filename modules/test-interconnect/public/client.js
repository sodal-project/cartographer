class TestInterconnectModule extends window.CoreClientModule {
  static moduleName = 'test-interconnect';

  async init() {
    const state = await this.call({
      method: 'getData'
    });
    this.updateUI(state);
  }

  updateUI(state) {
    this.renderComponent({
      html: `
        <div class="p-8" style="max-width: 640px">
          <h2 class="text-xl font-bold mb-4 text-white">Test Interconnect</h2>
          
          <div class="bg-gray-800 rounded-lg p-6 mb-4">
            <h3 class="text-lg font-semibold mb-4 text-white">Config Module</h3>
            <div id="config-mount"></div>
          </div>

          <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-white">Server Integration Test</h3>
            <button id="update-btn" class="bg-indigo-600 p-1 px-6 rounded text-white text-sm hover:bg-indigo-500">
              Update Config via Server
            </button>
          </div>
        </div>
      `
    });

    // Mount the config submodule
    this.renderSubmodule({
      module: 'test-config',
      mountId: 'config-mount',
      instanceId: state.configInstanceId
    });
  }

  setupEvents() {
    this.shadowRoot.getElementById('update-btn')
      .addEventListener('click', () => this.updateConfigIndirect());
  }

  async updateConfigIndirect() {
    await this.call({
      method: 'updateConfigIndirect',
      params: {
        instanceId: this.state.configInstanceId,
        key: 'serverUpdate',
        value: `Updated from server at ${new Date().toISOString()}`
      }
    });
  }
}

if (window.CoreClientModule) {
  window.CoreClientModule.define(TestInterconnectModule);
} else {
  console.error('CoreClientModule not loaded');
}
