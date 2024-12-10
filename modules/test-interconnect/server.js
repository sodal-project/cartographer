import { CoreModule } from '../../core/core.js';

class TestInterconnect extends CoreModule {
  constructor() {
    super('test-interconnect');
    this.configInstanceId = 'test-interconnect-config';
  }

  async index(req) {
    const instanceId = req.instanceId || 'test-interconnect-default';
    return this.renderComponent('test-interconnect-module', {
      id: instanceId,
      moduleName: this.name
    });
  }

  async getData({ instanceId }) {
    return {
      configInstanceId: this.configInstanceId
    };
  }

  // Method 1: Update through this module
  async updateConfigIndirect({ instanceId, key, value }) {
    return await this.core.mod["test-config"].writeConfig({ 
      instanceId: this.configInstanceId, 
      key, 
      value 
    });
  }
}

export default new TestInterconnect();
