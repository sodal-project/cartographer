import { CoreModule } from '../../core/core.js';

class TestLongProcess extends CoreModule {
  constructor() {
    super('test-long-process');
  }

  async index({ instanceId }) {
    instanceId = instanceId || 'test-long-process-default';
    
    // Initialize state if needed
    const state = await this.getState(instanceId);
    if (!state?.status) {
      await this.setState(instanceId, { status: 'ready' });
    }

    return this.renderComponent(instanceId);
  }

  async longProcess({ instanceId }) {
    // Set status to running
    await this.setState(instanceId, { status: 'running' });
    
    // Simulate long process
    setTimeout(async () => {
      await this.setState(instanceId, { status: 'ready' });
      await this.broadcastState({ instanceId });
    }, 15000);

    return await this.broadcastState({ instanceId });
  }

  async broadcastState({ instanceId }) {
    return await super.broadcastState(instanceId);
  }
}

export default new TestLongProcess();
