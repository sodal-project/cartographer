// modules/personaTable/server.js
import { CoreModule } from '../../core/core.js';

class PersonaTable extends CoreModule {
  constructor() {
    super('persona-table');
    
    this.filterOperators = [
      { label: 'Is', value: 'is' },
      { label: 'Is Not', value: 'is-not' },
      { label: 'Contains', value: 'contains' },
      { label: 'Not Contains', value: 'not-contains' },
      { label: 'Starts With', value: 'starts-with' },
      { label: 'Ends With', value: 'ends-with' },
      { label: 'Empty', value: 'not-empty' }
    ];

    this.sortDirections = [
      { label: 'Ascending', value: 'ASC' },
      { label: 'Descending', value: 'DESC' }
    ];
  }

  async index({ instanceId }) {
    instanceId = instanceId || 'persona-table-default';
    
    const state = await this.getState(instanceId);
    if (!state) {
      await this.setupNewInstance(instanceId);
    }

    return this.renderComponent(instanceId);
  }

  async setupNewInstance(instanceId) {
    // Get initial personas using readPersonas with no filters
    const filterResponse = await this.core.graph.readPersonas([], {
      field: 'id',
      direction: 'ASC',
      pageNum: 1,
      pageSize: 100
    });

    // Get fields from the returned personas
    const fields = this.getFieldsFromPersonas(filterResponse.personas);
    
    const defaultState = {
      tableFormId: instanceId,
      fields: fields.map(field => ({
        label: field.charAt(0).toUpperCase() + field.slice(1),
        value: field
      })),
      rows: this.rowsFromPersonaArray(filterResponse.personas),
      filters: [],
      sortField: 'id',
      sortDirection: 'ASC',
      selectedUpns: [],
      filterOperators: this.filterOperators,
      sortDirections: this.sortDirections,
      totalCount: filterResponse.totalCount,
      filteredUpns: filterResponse.upns,
      queryTime: filterResponse.time,
      graphFilters: [] // Empty array since no filters applied yet
    };

    await this.setState(instanceId, defaultState);
    return { success: true };
  }

  async update({ instanceId, sortField, sortDirection, filters }) {
    const state = await this.getState(instanceId);
    if (!state) return { success: false, message: 'Table state not found' };

    // Update sort and filter settings
    const updatedState = {
      ...state,
      sortField: sortField || state.sortField,
      sortDirection: sortDirection || state.sortDirection,
      filters: filters || state.filters
    };

    // Convert filters to graph format
    const graphFilters = this.filtersToGraphFormat(updatedState.filters);
    updatedState.graphFilters = graphFilters; // Store for CSV export

    // Fetch filtered/sorted data using readPersonas
    const filterResponse = await this.core.graph.readPersonas(graphFilters, {
      field: updatedState.sortField,
      direction: updatedState.sortDirection,
      pageNum: 1,
      pageSize: 100
    });

    // Update state with response data
    updatedState.rows = this.rowsFromPersonaArray(filterResponse.personas);
    updatedState.totalCount = filterResponse.totalCount;
    updatedState.filteredUpns = filterResponse.upns;
    updatedState.queryTime = filterResponse.time;

    // Save and broadcast
    await this.setState(instanceId, updatedState);
    return await this.broadcastState({ instanceId });
  }

  async addFilter({ instanceId, field, operator, value }) {
    const state = await this.getState(instanceId);
    if (!state) return { success: false, message: 'Table state not found' };

    const newFilter = {
      field: field || state.fields[0].value,
      operator: operator || this.filterOperators[0].value,
      value: value || ''
    };

    state.filters.push(newFilter);

    return this.update({ 
      instanceId, 
      filters: state.filters 
    });
  }

  async updateFilter({ instanceId, index, field, operator, value }) {
    const state = await this.getState(instanceId);
    if (!state) return { success: false, message: 'Table state not found' };

    if (index >= 0 && index < state.filters.length) {
      state.filters[index] = {
        field: field || state.filters[index].field,
        operator: operator || state.filters[index].operator,
        value: value || state.filters[index].value
      };
    }

    return this.update({ 
      instanceId, 
      filters: state.filters 
    });
  }

  async removeFilter({ instanceId, index }) {
    const state = await this.getState(instanceId);
    if (!state) return { success: false, message: 'Table state not found' };

    state.filters.splice(index, 1);
    
    return this.update({ 
      instanceId, 
      filters: state.filters 
    });
  }

  async updateSelectedUpns({ instanceId, upn, action }) {
    const state = await this.getState(instanceId);
    if (!state) return { success: false, message: 'Table state not found' };

    const selectedUpns = new Set(state.selectedUpns);
    if (action === 'add') {
      selectedUpns.add(upn);
    } else {
      selectedUpns.delete(upn);
    }

    state.selectedUpns = Array.from(selectedUpns);
    await this.setState(instanceId, state);
    return await this.broadcastState({ instanceId });
  }

  async updateAllSelectedUpns({ instanceId, selected }) {
    const state = await this.getState(instanceId);
    if (!state) return { success: false, message: 'Table state not found' };

    state.selectedUpns = selected ? state.rows.map(row => row.upn) : [];
    
    await this.setState(instanceId, state);
    return await this.broadcastState({ instanceId });
  }

  // Helper Methods
  getFieldsFromPersonas(personas) {
    const defaultFields = ['upn', 'id', 'name', 'type', 'platform'];
    const actualFields = [...new Set(personas.map(row => Object.keys(row)).flat())].sort();
    return [...new Set([...defaultFields, ...actualFields])];
  }

  rowsFromPersonaArray(personas) {
    return personas.map(persona => {
      const processedRow = { upn: persona.upn };
      for (const field of Object.keys(persona)) {
        if (field !== 'upn') {
          processedRow[field] = persona[field] || '';
        }
      }
      return processedRow;
    });
  }

  filtersToGraphFormat(filters) {
    return filters.map(filter => {
      const type = 'field';
      const key = filter.field;
      const value = filter.value;

      switch (filter.operator) {
        case 'is':
          return { type, key, value, operator: '=', not: false };
        case 'is-not':
          return { type, key, value, operator: '<>', not: false };
        case 'contains':
          return { type, key, value, operator: 'contains', not: false };
        case 'not-contains':
          return { type, key, value, operator: 'contains', not: true };
        case 'starts-with':
          return { type, key, value, operator: 'startswith', not: false };
        case 'ends-with':
          return { type, key, value, operator: 'endswith', not: false };
        case 'not-empty':
          return { type, key, value: '', operator: '<>', not: false };
      }
    });
  }

  async broadcastState({ instanceId }) {
    return await super.broadcastState({ instanceId });
  }
}

export default new PersonaTable();
