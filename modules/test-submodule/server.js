import { CoreModule } from '../../core/core.js';

class TestSubmodule extends CoreModule {
  constructor() {
    super('test-submodule');
    this.setState(`${this.name}-default`, {});
  }

  async index({ instanceId }) {
    instanceId = instanceId || `${this.name}-default`;
    const instanceState = await this.getState(instanceId);
    if(!instanceState){ await this.setupNewInstance(instanceId, {}); }

    return this.renderComponent(instanceId);
  }

  async setupNewInstance(instanceId, instanceState) {
    return await this.setState(instanceId, instanceState);
  }

  async broadcastState({ instanceId }) {
    return await super.broadcastState({ instanceId });
  }
}

export default new TestSubmodule();
