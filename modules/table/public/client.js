class TableModule extends CoreClientModule {
  static moduleName = 'table';

  updateUI(state) {
    console.log('Table updateUI called with state:', state);
    this.renderComponent({
      html: `
        <div class="table-module p-4 bg-gray-900">
          <!-- Controls -->
          <div class="controls-bar mb-4">
            ${this.renderControls(state)}
          </div>

          <!-- Table -->
          <div class="table-wrapper overflow-hidden rounded-lg border border-gray-700">
            <table class="min-w-full divide-y divide-gray-700">
              ${this.renderHeader(state)}
              ${this.renderBody(state)}
            </table>
          </div>
        </div>
      `
    });
  }

  setupEvents() {
    console.log('Table setupEvents called');
    const root = this.shadowRoot;
    
    this.addEventListener('click', '[data-sort]', async (e, target) => {
      const field = target.dataset.sort;
      const direction = this.state.ui.sort.field === field && 
                       this.state.ui.sort.direction === 'asc' ? 'desc' : 'asc';
      
      await this.call({
        method: 'updateSort',
        params: { field, direction }
      });
    });

    this.addEventListener('click', '[data-remove-filter]', async (e, target) => {
      const index = parseInt(target.dataset.removeFilter);
      await this.call({
        method: 'removeFilter',
        params: { index }
      });
    });

    this.addEventListener('submit', '.filter-form', async (e, target) => {
      e.preventDefault();
      const formData = new FormData(target);
      const filterData = {
        field: formData.get('field'),
        operator: formData.get('operator'),
        value: formData.get('value')
      };
      
      target.reset();

      await this.call({
        method: 'addFilter',
        params: { filter: filterData }
      });
    });
  }

  renderControls(state) {
    return `
      <div class="flex flex-col gap-4">
        <!-- Filter Form -->
        <form class="filter-form flex items-center gap-2">
          <select name="field" class="form-select bg-gray-800 text-gray-300 border-gray-700 rounded">
            ${state.config.columns.map(col => `
              <option value="${col.key}">${col.label}</option>
            `).join('')}
          </select>

          <select name="operator" class="form-select bg-gray-800 text-gray-300 border-gray-700 rounded">
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="startsWith">Starts with</option>
            <option value="endsWith">Ends with</option>
          </select>

          <input 
            type="text" 
            name="value" 
            placeholder="Filter value..." 
            class="form-input bg-gray-800 text-gray-300 border-gray-700 rounded"
          >

          <button type="submit" class="btn-control">
            Apply Filter
          </button>
        </form>

        <!-- Active Filters -->
        <div class="flex flex-wrap gap-2">
          ${state.ui.filters.map((filter, index) => `
            <div class="filter-tag">
              ${filter.field} ${filter.operator} "${filter.value}"
              <button data-remove-filter="${index}" class="ml-2">×</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderHeader(state) {
    return `
      <thead>
        <tr>
          ${state.config.columns.map(col => `
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              <button data-sort="${col.key}" class="flex items-center gap-1">
                ${col.label}
                ${state.ui.sort.field === col.key ? 
                  (state.ui.sort.direction === 'asc' ? '↑' : '↓') : 
                  ''}
              </button>
            </th>
          `).join('')}
        </tr>
      </thead>
    `;
  }

  renderBody(state) {
    // Check if we have data
    if (!state?.data?.rows?.length) {
        return `
            <tbody class="divide-y divide-gray-700">
                <tr>
                    <td colspan="${state?.config?.columns?.length || 1}" class="px-6 py-4 text-center text-gray-400">
                        No data available
                    </td>
                </tr>
            </tbody>
        `;
    }

    return `
        <tbody class="divide-y divide-gray-700">
            ${state.data.rows.map(row => `
                <tr>
                    ${state.config.columns.map(col => `
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            ${row[col.key] || ''}
                        </td>
                    `).join('')}
                </tr>
            `).join('')}
        </tbody>
    `;
  }
}

window.CoreClientModule.define(TableModule);
