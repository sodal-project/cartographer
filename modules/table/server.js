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
        maxRows: 250
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

  async updateSort({ instanceId, field, direction }) {
    const state = await this.getState(instanceId);
    if (!state) return {
      success: false,
      message: `State not found for ${this.name} instance ${instanceId}`
    };

    state.ui.sort = { field, direction };
    this.sortData(state.data.rows, field, direction);

    await this.setState(instanceId, state);
    return await this.broadcastState({ instanceId });
  }

  async addFilter({ instanceId, filter }) {
    const state = await this.getState(instanceId);
    if (!state) return {
      success: false,
      message: `State not found for ${this.name} instance ${instanceId}`
    };

    // Add new filter
    state.ui.filters.push(filter);
    
    // Apply all filters
    state.data.rows = this.getDefaultState().data.rows.filter(row => {
      return state.ui.filters.every(filter => {
        const value = row[filter.field]?.toString().toLowerCase();
        const filterValue = filter.value.toLowerCase();
        
        switch (filter.operator) {
          case 'contains':
            return value.includes(filterValue);
          case 'equals':
            return value === filterValue;
          case 'startsWith':
            return value.startsWith(filterValue);
          case 'endsWith':
            return value.endsWith(filterValue);
          default:
            return true;
        }
      });
    });

    // Update total rows count
    state.data.totalRows = state.data.rows.length;
    
    await this.setState(instanceId, state);
    return await this.broadcastState({ instanceId });
  }

  async removeFilter({ instanceId, index }) {
    const state = await this.getState(instanceId);
    if (!state) return {
      success: false,
      message: `State not found for ${this.name} instance ${instanceId}`
    };

    // Remove filter
    state.ui.filters.splice(index, 1);
    
    // Reset data and reapply remaining filters
    state.data = { ...this.getDefaultState().data };
    
    if (state.ui.filters.length > 0) {
      state.data.rows = state.data.rows.filter(row => {
        return state.ui.filters.every(filter => {
          const value = row[filter.field]?.toString().toLowerCase();
          const filterValue = filter.value.toLowerCase();
          
          switch (filter.operator) {
            case 'contains':
              return value.includes(filterValue);
            case 'equals':
              return value === filterValue;
            case 'startsWith':
              return value.startsWith(filterValue);
            case 'endsWith':
              return value.endsWith(filterValue);
            default:
              return true;
          }
        });
      });
      state.data.totalRows = state.data.rows.length;
    }

    // Reapply current sort if exists
    if (state.ui.sort.field) {
      this.sortData(state.data.rows, state.ui.sort.field, state.ui.sort.direction);
    }

    await this.setState(instanceId, state);
    return await this.broadcastState({ instanceId });
  }

  // Helper method for sorting
  sortData(rows, field, direction) {
    rows.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Convert to strings for comparison
      aVal = aVal?.toString().toLowerCase() ?? '';
      bVal = bVal?.toString().toLowerCase() ?? '';
      
      return direction === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    });
  }
}

export default new TableModule();
