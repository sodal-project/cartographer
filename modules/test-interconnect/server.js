import { CoreModule } from '../../core/core.js';

class TestInterconnect extends CoreModule {
  constructor() {
    super('test-interconnect');
    this.configInstanceId = 'test-interconnect-config';
    this.defaultInstanceId = 'test-interconnect-default';
  }

  async init() {
    await this.core.mod["test-config"].setupNewInstance(this.configInstanceId, {});
    await this.setState(this.defaultInstanceId, {});
  }

  async index({ instanceId }) {
    instanceId = instanceId || this.defaultInstanceId;
    return this.renderComponent(instanceId);
  }

  async broadcastState({ instanceId }) {
    return await super.broadcastState({ instanceId });
  }
  // Update an instance of test-config module through this module
  async updateConfigIndirect({ instanceId, key, value }) {
    await this.core.mod["test-config"].writeConfig({ 
      instanceId: this.configInstanceId, 
      key, 
      value 
    });
    return await this.core.mod["test-config"].broadcastState({ instanceId: this.configInstanceId });
  }
}

export default new TestInterconnect();
