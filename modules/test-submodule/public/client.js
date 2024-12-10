class TestSubmoduleModule extends window.CoreClientModule {
  static moduleName = 'test-submodule';

  async init() {
    this.shadowRoot.innerHTML = `
      <div class="p-8">
        <h2 class="text-xl font-bold mb-6 text-white">Test Submodule Dashboard</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Test Config Panel -->
          <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-white">Test Config</h3>
            <div id="test-config-mount"></div>
          </div>

          <!-- Test Long Process Panel -->
          <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-white">Long Process</h3>
            <div id="test-long-process-mount"></div>
          </div>

          <!-- Test Ping Panel -->
          <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-white">Ping Counter</h3>
            <div id="test-ping-mount"></div>
          </div>
        </div>
      </div>
    `;

    // Load submodules
    await Promise.all([
      this.loadSubmodule('test-config', 'test-config-mount'),
      this.loadSubmodule('test-long-process', 'test-long-process-mount'),
      this.loadSubmodule('test-ping', 'test-ping-mount')
    ]);
  }

  async loadSubmodule(moduleName, mountId) {
    try {
      const response = await fetch(`/mod/${moduleName}/index`);
      const html = await response.text();
      this.shadowRoot.getElementById(mountId).innerHTML = html;
    } catch (error) {
      console.error(`Failed to load ${moduleName}:`, error);
      this.shadowRoot.getElementById(mountId).innerHTML = 
        `<p class="text-red-500">Failed to load ${moduleName}</p>`;
    }
  }
}

window.CoreClientModule.define(TestSubmoduleModule);
