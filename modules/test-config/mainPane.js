// modules/test-config/index.js
import core from '../../core/core.js';

class TestConfig extends core.server.CoreServerModule {
  constructor() {
    super('test-config');
  }

  async mainPane(req) {
    const instanceId = req.instance || crypto.randomUUID();
    const data = await this.getData(req, instanceId);
    
    return this.renderComponent('test-config-module', {
      id: `test-config-${instanceId}`,
      'initial-data': data
    });
  }

  // API endpoints
  async getData(req, instanceId) {
    const config = await core.config.readConfig();
    return { config };
  }

  async writeConfig(req) {
    const { key, value } = req;
    if (!key || !value) {
      throw new Error('Missing required fields: key and value');
    }

    await core.config.writeConfig({ [key]: value });
    
    // Send updated data back
    const newConfig = await core.config.readConfig();
    await this.update(req.instance, { config: newConfig });
    
    return { success: true };
  }

  async deleteConfig(req) {
    const { key } = req;
    if (!key) {
      throw new Error('Missing required field: key');
    }

    await core.config.deleteConfig(key);
    
    // Send updated data back
    const newConfig = await core.config.readConfig();
    await this.update(req.instance, { config: newConfig });
    
    return { success: true };
  }
}

const testConfig = new TestConfig();

export const mainPane = (...args) => testConfig.mainPane(...args);
export const getData = (...args) => testConfig.getData(...args);
export const writeConfig = (...args) => testConfig.writeConfig(...args);
export const deleteConfig = (...args) => testConfig.deleteConfig(...args);