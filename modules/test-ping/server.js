import { CoreModule } from '../../core/core.js';

class TestPing extends CoreModule {
  constructor() {
    super('test-ping');
  }

  async index(req) {
    return this.renderComponent('test-ping-module', {
      id: 'test-ping'
    });
  }

  async getData({ instanceId }) {
    const state = await this.getState(instanceId);
    return {
      count: state.count || 0
    };
  }

  async ping({ instanceId }) {
    const state = await this.getState(instanceId);
    return await this.setState(instanceId, {
      count: (state.count || 0) + 1
    });
  }
}

// Create a single instance
const testPing = new TestPing();

// Export all the module functions
export default {
  index: (...args) => testPing.index(...args),
  getData: (...args) => testPing.getData(...args),
  ping: (...args) => testPing.ping(...args)
}; 