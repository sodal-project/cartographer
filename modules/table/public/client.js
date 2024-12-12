class TableModule extends CoreClientModule {
  static moduleName = 'table';

  updateUI(state) {
    console.log('Table state updated:', state);
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
    this.shadowRoot.addEventListener('click', async (e) => {
      // Handle sorting
      const sortButton = e.target.closest('[data-sort]');
      if (sortButton) {
        const field = sortButton.dataset.sort;
        const direction = state.ui.sort.field === field && 
                         state.ui.sort.direction === 'asc' ? 'desc' : 'asc';
        
        await this.call({
          method: 'updateSort',
          params: { field, direction }
        });
        return;
      }

      // Handle filter removal
      const removeFilter = e.target.closest('[data-remove-filter]');
      if (removeFilter) {
        const index = parseInt(removeFilter.dataset.removeFilter);
        await this.call({
          method: 'removeFilter',
          params: { index }
        });
      }
    });

    // Handle filter form
    const filterForm = this.shadowRoot.querySelector('.filter-form');
    if (filterForm) {
      filterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(filterForm);
        
        await this.call({
          method: 'addFilter',
          params: {
            filter: {
              field: formData.get('field'),
              operator: formData.get('operator'),
              value: formData.get('value')
            }
          }
        });

        filterForm.reset();
      });
    }
  }

  renderControls(state) {
    return `
      <div class="flex items-center gap-4">
        <!-- Sort Dropdown -->
        <div class="relative" data-control="sort">
          <button class="btn-control">
            Sort: ${state.ui.sort.field || 'Default'}
            ${state.ui.sort.direction === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <!-- Active Filters -->
        <div class="flex gap-2">
          ${state.ui.filters.map((filter, index) => `
            <div class="filter-tag">
              ${filter.field} ${filter.operator} ${filter.value}
              <button data-remove-filter="${index}">×</button>
            </div>
          `).join('')}
        </div>

        <!-- Add Filter -->
        <button class="btn-control" data-action="add-filter">
          + Add Filter
        </button>
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
