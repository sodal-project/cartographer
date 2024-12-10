import { CoreModule } from '../../core/core.js';

class TestLongProcess extends CoreModule {
  constructor() {
    super('test-long-process');
  }

  async index(req) {
    const instanceId = req.instanceId || 'test-long-process-default';
    
    // Initialize state if needed
    const state = await this.getState(instanceId);
    if (!state.status) {
      await this.setState(instanceId, { status: 'ready' });
    }

    return this.renderComponent('test-long-process-module', {
      id: instanceId,
      moduleName: this.name
    });
  }

  async getData({ instanceId }) {
    const state = await this.getState(instanceId);
    return state.status ? state : { status: 'ready' };
  }

  async longProcess({ instanceId }) {
    // Set status to running
    await this.setState(instanceId, { status: 'running' });
    
    // Simulate long process
    setTimeout(async () => {
      await this.setState(instanceId, { status: 'ready' });
    }, 15000);
    
    return { success: true };
  }
}

export default new TestLongProcess();
