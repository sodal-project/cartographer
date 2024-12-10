import { CoreModule } from '../../core/core.js';

class TestSubmodule extends CoreModule {
  constructor() {
    super('test-submodule');
  }

  async index(req) {
    const instanceId = req.instanceId || crypto.randomUUID();
    return this.renderComponent('test-submodule-module', {
      id: instanceId,
      moduleName: this.name
    });
  }

  // Simple getData to support our new pattern
  async getData({ instanceId }) {
    return {};  // No state needed, just mounting submodules
  }
}

export default new TestSubmodule();
