import { CoreModule } from '../../core/core.js';

class TestSubmodule extends CoreModule {
  constructor() {
    super('test-submodule');
  }

  async index(req) {
    return this.renderComponent('test-submodule-module', {
      id: 'test-submodule'
    });
  }

  async getData({ instanceId }) {
    const state = await this.getState(instanceId);
    return {
      status: state.status || 'ready'
    };
  }
}

// Create a single instance
const testSubmodule = new TestSubmodule();

// Export all the module functions
export default {
  index: (...args) => testSubmodule.index(...args),
  getData: (...args) => testSubmodule.getData(...args)
};
