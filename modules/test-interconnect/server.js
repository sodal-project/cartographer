import { CoreModule } from '../../core/core.js';

class TestInterconnect extends CoreModule {
  constructor() {
    super('test-interconnect');
    this.defaultInstanceId = 'test-interconnect-default';
    this.configInstanceId = 'test-interconnect-config';
  }

  async init() {
    await this.core.mod["test-config"].setupNewInstance(this.configInstanceId, {});
    await this.setState(this.defaultInstanceId, { configInstanceId: this.configInstanceId });
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

const testInterconnect = new TestInterconnect();
testInterconnect.init();

export default testInterconnect;
