// modules/test-config/index.js
import { CoreModule } from '../../core/core.js';

class TestConfig extends CoreModule {
  constructor() {
    super('test-config');
  }

  async getData({ instanceId }) {
    const state = await this.getState(instanceId);
    return state;
  }

  async writeConfig({ instanceId, key, value }) {
    try {
      // Get current state
      const state = await this.getState(instanceId);
      
      // Update state
      state[key] = value;
      
      // Save and broadcast
      await this.setState(instanceId, state);
      
      return { success: true };
    } catch (error) {
      console.error('writeConfig error:', error);
      return { error: error.message };
    }
  }

  async deleteConfig({ instanceId, key }) {
    try {
      // Get current state
      const state = await this.getState(instanceId);
      
      // Delete key
      delete state[key];
      
      // Save and broadcast
      await this.setState(instanceId, state);
      
      return { success: true };
    } catch (error) {
      console.error('deleteConfig error:', error);
      return { error: error.message };
    }
  }

  async index(req) {
    return this.renderComponent('test-config-module', {
      id: `test-config-${req.instance || 'default'}`
    });
  }
}

export default new TestConfig();

