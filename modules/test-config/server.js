// modules/test-config/index.js
import core from '../../core/core.js';

class TestConfig extends core.server.CoreServerModule {
  constructor() {
    super('test-config');
  }

  async getData(instance) {
    try {
      // Get config using the config system
      const config = await core.config.readConfig() || {};
      return { config };
    } catch (error) {
      console.error('getData error:', error);
      return { error: error.message, config: {} };
    }
  }

  async writeConfig({ instanceId, key, value }) {
    try {
      // Get existing config
      const config = await core.config.readConfig() || {};
      
      // Update config
      config[key] = value;
      
      // Save config using the config system
      await core.config.writeConfig(config);
      
      // Notify clients
      this.update(instanceId, { config });
      
      return { success: true };
    } catch (error) {
      console.error('writeConfig error:', error);
      return { error: error.message };
    }
  }

  async deleteConfig({ instanceId, key }) {
    try {
      // Delete key using the config system
      await core.config.deleteConfig(key);
      
      // Get updated config
      const config = await core.config.readConfig() || {};
      
      // Notify clients
      this.update(instanceId, { config });
      
      return { success: true };
    } catch (error) {
      console.error('deleteConfig error:', error);
      return { error: error.message };
    }
  }

  async index(req) {
    try {
      return this.renderComponent('test-config-module', {
        id: `test-config-${req.instance || crypto.randomUUID()}`
      });
    } catch (error) {
      console.error('index error:', error);
      return `<div class="error">Error loading test config: ${error.message}</div>`;
    }
  }
}

// Create a single instance
const testConfig = new TestConfig();

// Export all the module functions
export default {
  index: (...args) => testConfig.index(...args),
  getData: (...args) => testConfig.getData(...args),
  writeConfig: (...args) => testConfig.writeConfig(...args),
  deleteConfig: (...args) => testConfig.deleteConfig(...args)
};
