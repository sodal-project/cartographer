// modules/table/server.js
import { CoreModule } from '../../core/core.js';

class TableModule extends CoreModule {
  constructor() {
    super('table');
    this.dataFetchers = new Map();
  }

  // Get default state for a new table instance
  getDefaultState(config = {}) {
    return {
      config: {
        columns: [],
        pageSize: 25,
        selectable: false,
        filterable: false,
        sortable: false,
        ...config
      },
      data: {
        rows: [],
        totalRows: 0
      },
      ui: {
        currentPage: 1,
        sort: {
          field: null,
          direction: 'asc'
        },
        filters: [],
        selectedRows: [],
        visibleColumns: config.columns?.map(col => col.key) || []
      }
    };
  }

  // Override getState to handle initialization
  async getState(instanceId) {
    let state = await super.getState(instanceId);
    
    // If no state exists, initialize with defaults
    if (!state || Object.keys(state).length === 0) {
      state = this.getDefaultState();
      await this.setState(instanceId, state);
    }
    
    return state;
  }

  // Update methods
  async updatePage({ instanceId, page }) {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error('Invalid page number');
    }

    const state = await this.getState(instanceId);
    const totalPages = Math.ceil(state.data.totalRows / state.config.pageSize);
    
    if (page > totalPages) {
      throw new Error('Page number exceeds total pages');
    }

    return this.setState(instanceId, {
      ...state,
      ui: {
        ...state.ui,
        currentPage: page
      }
    });
  }

  async updateSort({ instanceId, field, direction }) {
    if (!['asc', 'desc'].includes(direction)) {
      throw new Error('Invalid sort direction');
    }

    const state = await this.getState(instanceId);
    const validFields = state.config.columns
      .filter(col => col.sortable)
      .map(col => col.key);

    if (!validFields.includes(field)) {
      throw new Error('Invalid sort field');
    }

    return this.setState(instanceId, {
      ...state,
      ui: {
        ...state.ui,
        sort: { field, direction }
      }
    });
  }

  async updateFilters({ instanceId, filters }) {
    const state = await this.getState(instanceId);
    const validFields = state.config.columns
      .filter(col => col.filterable)
      .map(col => col.key);

    filters.forEach(filter => {
      if (!validFields.includes(filter.field)) {
        throw new Error(`Invalid filter field: ${filter.field}`);
      }
      if (!['contains', 'equals', 'startsWith', 'endsWith'].includes(filter.operator)) {
        throw new Error(`Invalid filter operator: ${filter.operator}`);
      }
    });

    return this.setState(instanceId, {
      ...state,
      ui: {
        ...state.ui,
        filters
      }
    });
  }

  async removeFilter({ instanceId, index }) {
    const state = await this.getState(instanceId);
    const filters = [...state.ui.filters];
    filters.splice(index, 1);

    return this.setState(instanceId, {
      ...state,
      ui: {
        ...state.ui,
        filters,
        currentPage: 1
      }
    });
  }

  async addFilter({ instanceId, filter }) {
    const state = await this.getState(instanceId);
    const filters = [...state.ui.filters, filter];

    return this.setState(instanceId, {
      ...state,
      ui: {
        ...state.ui,
        filters,
        currentPage: 1
      }
    });
  }

  async updateSelection({ instanceId, selectedRows }) {
    const state = await this.getState(instanceId);
    
    return this.setState(instanceId, {
      ...state,
      ui: {
        ...state.ui,
        selectedRows
      }
    });
  }

  // Helper method to fetch table data
  async fetchTableData(fetchers, state) {
    if (!fetchers) return state.data;
    if (!state.config) {
      console.error('No config in state:', state);
      return state.data;
    }

    const start = (state.ui.currentPage - 1) * state.config.pageSize;
    const end = start + state.config.pageSize;

    return {
      rows: await fetchers.fetchRows({
        start,
        end,
        sort: state.ui.sort,
        filters: state.ui.filters
      }),
      totalRows: await fetchers.getTotalRows({ filters: state.ui.filters })
    };
  }

  // Demo setup method
  async index(req) {
    const instanceId = 'table-demo';
    console.log('Starting table demo setup');
    
    try {
      // Initialize with demo config
      const state = this.getDefaultState({
        columns: [
          { key: 'id', label: 'ID', sortable: true },
          { key: 'name', label: 'Name', sortable: true, filterable: true },
          { key: 'email', label: 'Email', filterable: true },
          { key: 'role', label: 'Role', filterable: true },
          { key: 'status', label: 'Status' }
        ],
        pageSize: 25,
        selectable: true,
        filterable: true,
        sortable: true
      });

      // Register demo data fetchers
      this.dataFetchers.set(instanceId, {
        fetchRows: async ({ start, end, sort, filters }) => {
          // Generate demo data
          const demoData = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            role: i % 3 === 0 ? 'Admin' : 'User',
            status: i % 2 === 0 ? 'Active' : 'Inactive'
          }));

          // Apply filters and sorting
          let filteredData = filters.length > 0 
            ? demoData.filter(row => 
                filters.every(filter => {
                  const value = row[filter.field]?.toString().toLowerCase();
                  const filterValue = filter.value.toLowerCase();
                  switch (filter.operator) {
                    case 'contains': return value.includes(filterValue);
                    case 'equals': return value === filterValue;
                    default: return true;
                  }
                })
              )
            : demoData;

          if (sort.field) {
            filteredData.sort((a, b) => {
              const aVal = a[sort.field]?.toString().toLowerCase();
              const bVal = b[sort.field]?.toString().toLowerCase();
              return sort.direction === 'asc' 
                ? aVal.localeCompare(bVal) 
                : bVal.localeCompare(aVal);
            });
          }

          return filteredData.slice(start, end);
        },
        getTotalRows: async ({ filters }) => {
          const demoData = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            role: i % 3 === 0 ? 'Admin' : 'User',
            status: i % 2 === 0 ? 'Active' : 'Inactive'
          }));

          if (filters.length > 0) {
            return demoData.filter(row => 
              filters.every(filter => {
                const value = row[filter.field]?.toString().toLowerCase();
                const filterValue = filter.value.toLowerCase();
                switch (filter.operator) {
                  case 'contains': return value.includes(filterValue);
                  case 'equals': return value === filterValue;
                  default: return true;
                }
              })
            ).length;
          }
          
          return demoData.length;
        }
      });

      // Get initial data
      state.data = await this.fetchTableData(this.dataFetchers.get(instanceId), state);
      
      // Save state
      await this.setState(instanceId, state);

      // Render the demo table
      return `
        <div class="p-4">
          <h2 class="text-xl mb-4">Table Module Demo</h2>
          ${await this.render({ instanceId })}
        </div>
      `;
    } catch (error) {
      console.error('Error in table demo setup:', error);
      throw error;
    }
  }

  async render({ instanceId }) {
    return this.renderComponent('table-module', {
      id: instanceId,
      moduleName: this.name
    });
  }
}

export default new TableModule();