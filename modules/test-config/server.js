// modules/test-config/index.js
import { CoreModule } from '../../core/core.js';

class TestConfig extends CoreModule {
  constructor() {
    super('test-config');
  }

  async writeConfig({ instanceId, key, value }) {
    // Get current state
    const state = await this.getState(instanceId);
    
    // Update state
    state[key] = value;
    
    // Save and broadcast
    await this.setState(instanceId, state); 
    
    return await this.broadcastState({ instanceId });
  }

  async deleteConfig({ instanceId, key }) {
    // Get current state
    const state = await this.getState(instanceId);
    if(!state){ return {
      success: false,
      error: `State not found for ${this.name} instance ${instanceId}`
    }}
    
    delete state[key];
    
    // Save and broadcast
    await this.setState(instanceId, state);

    return await this.broadcastState({ instanceId });
  }

  async index({ instanceId }) {
    instanceId = instanceId || 'test-config-default';
    const instanceState = await this.getState(instanceId);
    if(!instanceState){
      await this.setupNewInstance(instanceId, {});
    }
    return this.renderComponent(instanceId);
  }

  async setupNewInstance(instanceId, instanceState = {}) {
    return await this.setState(instanceId, instanceState);
  }

  async broadcastState({ instanceId }) {
    return await super.broadcastState({ instanceId });
  }
}

export default new TestConfig();

