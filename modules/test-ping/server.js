import { CoreModule } from '../../core/core.js';

class TestPing extends CoreModule {
  constructor() {
    super('test-ping');
  }

  async index({ instanceId }) {
    instanceId = instanceId || 'test-ping-default';
    const instanceState = await this.getState(instanceId);
    if(!instanceState){
      await this.setupNewInstance(instanceId, { pings: 0 });
    }
    return this.renderComponent(instanceId);
  }

  async setupNewInstance(instanceId, instanceState) {
    return await this.setState(instanceId, instanceState);
  }

  async ping({ instanceId }) {
    const state = await this.getState(instanceId);
    await this.setState(instanceId, { 
      pings: (state.pings || 0) + 1 
    });
    return await this.broadcastState({ instanceId});
  }

  async broadcastState({ instanceId }) {
    return await super.broadcastState(instanceId);
  }
}

export default new TestPing();
