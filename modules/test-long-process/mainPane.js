import core from '../../core/core.js';

class TestLongProcess extends core.server.CoreServerModule {
  constructor() {
    super('test-long-process');
  }

  async getData(instance) {
    try {
      // Get process state from config
      const config = await core.config.readConfig() || {};
      const processState = config[instance] || { status: 'ready' };
      return processState;
    } catch (error) {
      console.error('getData error:', error);
      return { error: error.message, status: 'ready' };
    }
  }

  async mainPane(req) {
    return this.renderComponent('test-long-process-module', {
      id: `test-long-process-${crypto.randomUUID()}`
    });
  }

  async longProcess(req) {
    const { instanceId } = req;
    
    try {
      // Get current config
      let config = await core.config.readConfig() || {};
      
      // Update process state
      config = { 
        status: 'running',
      };
      await core.config.writeConfig(config);
      
      // Notify clients
      await this.update(instanceId, { status: 'running' });
      
      // Simulate long process
      setTimeout(async () => {
        const currentConfig = {
          status: 'ready'
        };
        await core.config.writeConfig(currentConfig);
        await this.update(instanceId, currentConfig);
      }, 15000);
      
      return { success: true };
    } catch (error) {
      console.error('longProcess error:', error);
      return { error: error.message };
    }
  }
}

// Create a single instance
const testLongProcess = new TestLongProcess();

// Export all the module functions
export default {
  mainPane: (...args) => testLongProcess.mainPane(...args),
  getData: (...args) => testLongProcess.getData(...args),
  longProcess: (...args) => testLongProcess.longProcess(...args)
};
