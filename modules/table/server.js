// modules/table/server.js
import { CoreModule } from '../../core/core.js';

class TableModule extends CoreModule {
  constructor() {
    super('table');
  }

  getDefaultState() {
    return {
      config: {
        columns: [
          { key: 'id', label: 'ID', sortable: true },
          { key: 'name', label: 'Name', sortable: true },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' }
        ],
        pageSize: 5
      },
      data: {
        rows: [
          { id: 1, name: 'Alice Smith', email: 'alice@example.com', role: 'Admin' },
          { id: 2, name: 'Bob Jones', email: 'bob@example.com', role: 'User' },
          { id: 3, name: 'Carol Wilson', email: 'carol@example.com', role: 'User' },
          { id: 4, name: 'Dave Miller', email: 'dave@example.com', role: 'Admin' },
          { id: 5, name: 'Eve Brown', email: 'eve@example.com', role: 'User' },
          { id: 6, name: 'Frank Davis', email: 'frank@example.com', role: 'User' },
          { id: 7, name: 'Grace Taylor', email: 'grace@example.com', role: 'Admin' }
        ],
        totalRows: 7
      },
      ui: {
        currentPage: 1,
        sort: {
          field: null,
          direction: 'asc'
        },
        filters: [],
        selectedRows: []
      }
    };
  }

  async setupNewInstance(config = {}) {
    // Merge provided config with default state
    const defaultState = this.getDefaultState();
    const instanceState = {
      ...defaultState,
      ...config,
      // Ensure we preserve nested structures
      config: { ...defaultState.config, ...config?.config },
      data: { ...defaultState.data, ...config?.data },
      ui: { ...defaultState.ui, ...config?.ui }
    };
    return instanceState;
  }

  async index({ instanceId }) {
    instanceId = instanceId || 'table-demo';
    
    // Get current state or create new instance with default state
    let state = await this.getState(instanceId);
    if (!state) {
      state = await this.setupNewInstance();
      await this.setState(instanceId, state);
      await this.broadcastState({ instanceId });
    }
    
    return this.renderComponent(instanceId);
  }

  async broadcastState({ instanceId }) {
    return await super.broadcastState(instanceId);
  }

  async updatePage({ instanceId, page }) {
    const state = await this.getState(instanceId);
    if (!state) return {
      success: false,
      message: `State not found for ${this.name} instance ${instanceId}`
    };

    state.ui.currentPage = page;
    await this.setState(instanceId, state);
    return await super.broadcastState(instanceId);
  }

  async updateSort({ instanceId, field, direction }) {
    const state = await this.getState(instanceId);
    if (!state) return {
      success: false,
      message: `State not found for ${this.name} instance ${instanceId}`
    };

    state.ui.sort = { field, direction };
    
    // Sort the data
    state.data.rows.sort((a, b) => {
      const aVal = a[field]?.toString().toLowerCase();
      const bVal = b[field]?.toString().toLowerCase();
      return direction === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    });

    await this.setState(instanceId, state);
    return await super.broadcastState(instanceId);
  }
}

export default new TableModule();
