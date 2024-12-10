import { CoreModule } from '../../core/core.js';

class TestPing extends CoreModule {
  constructor() {
    super('test-ping');
  }

  async index(req) {
    const instanceId = req.instanceId || 'test-ping-default';
    
    // Initialize state if needed
    const state = await this.getState(instanceId);
    if (!state.pings) {
      await this.setState(instanceId, { pings: 0 });
    }

    return this.renderComponent('test-ping-module', {
      id: instanceId,
      moduleName: this.name
    });
  }

  async getData({ instanceId }) {
    const state = await this.getState(instanceId);
    return state.pings ? state : { pings: 0 };
  }

  async ping({ instanceId }) {
    const state = await this.getState(instanceId);
    const newState = { pings: (state.pings || 0) + 1 };
    await this.setState(instanceId, newState);
    return newState;
  }
}

export default new TestPing();
