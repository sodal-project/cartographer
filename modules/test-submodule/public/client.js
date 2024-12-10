class TestSubmoduleModule extends window.CoreClientModule {
  static moduleName = 'test-submodule';

  async init() {
    this.shadowRoot.innerHTML = `
      <div class="p-8">
        <h2 class="text-xl font-bold mb-4 text-white">Test Submodule</h2>
        
        <div class="flex flex-col gap-8">
          <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-white">Test Config</h3>
            <div id="config-mount"></div>
          </div>

          <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-white">Test Ping</h3>
            <div id="ping-mount"></div>
          </div>

          <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-white">Test Long Process</h3>
            <div id="process-mount"></div>
          </div>
        </div>
      </div>
    `;

    // Mount test-config with custom configuration
    await this.renderSubmodule('test-config', 'config-mount', {
      action: 'index',
      instanceId: 'shared-config'
    });

    // Mount test-ping with custom configuration
    await this.renderSubmodule('test-ping', 'ping-mount', {
      action: 'index',
      instanceId: 'shared-ping'
    });

    // Mount test-long-process with custom configuration
    await this.renderSubmodule('test-long-process', 'process-mount', {
      action: 'index',
      instanceId: 'shared-process'
    });
  }
}

if (window.CoreClientModule) {
  window.CoreClientModule.define(TestSubmoduleModule);
} else {
  console.error('CoreClientModule not loaded');
}
