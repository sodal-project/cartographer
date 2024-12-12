class TestSubmoduleModule extends window.CoreClientModule {
  static moduleName = 'test-submodule';

  updateUI(state) {
    this.renderComponent({
      html: `
        <div class="p-4">
          <h2 class="text-xl mb-4 text-white">Submodule Test</h2>
          
          <div class="bg-gray-800 rounded p-4 mb-4">
            <h3 class="text-lg mb-4 text-white">Config Module</h3>
            <div id="config-mount"></div>
          </div>

          <div class="bg-gray-800 rounded p-4 mb-4">
            <h3 class="text-lg mb-4 text-white">Long Process Module</h3>
            <div id="long-process-mount"></div>
          </div>

          <div class="bg-gray-800 rounded p-4">
            <h3 class="text-lg mb-4 text-white">Ping Module</h3>
            <div id="ping-mount"></div>
          </div>
        </div>
      `
    });

    // Mount submodules
    this.renderSubmodule({
      module: 'test-config',
      mountId: 'config-mount',
      instanceId: 'test-config-submodule'
    });

    this.renderSubmodule({
      module: 'test-long-process',
      mountId: 'long-process-mount',
      instanceId: 'test-long-process-submodule'
    });

    this.renderSubmodule({
      module: 'test-ping',
      mountId: 'ping-mount',
      instanceId: 'test-ping-submodule'
    });
  }
}

window.CoreClientModule.define(TestSubmoduleModule);
