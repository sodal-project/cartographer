import { CoreModule } from '../../core/core.js';

class TestLongProcess extends CoreModule {
  constructor() {
    super('test-long-process');
  }

  async index(req) {
    return this.renderComponent('test-long-process-module', {
      id: 'test-long-process'
    });
  }

  async longProcess(req) {
    const { instanceId } = req;
    
    try {
      // Update process state
      await this.setState(instanceId, { 
        status: 'running'
      });
      
      // Simulate long process
      setTimeout(async () => {
        await this.setState(instanceId, {
          status: 'ready'
        });
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
  index: (...args) => testLongProcess.index(...args),
  getData: async (instance) => await testLongProcess.getState(instance),
  longProcess: (...args) => testLongProcess.longProcess(...args)
};
