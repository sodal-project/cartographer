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

          <!-- Pagination -->
          ${this.renderPagination(state)}
        </div>
      `
    });
  }

  setupEvents() {
    this.shadowRoot.addEventListener('click', async (e) => {
      // Handle pagination
      const pageButton = e.target.closest('[data-page]');
      if (pageButton) {
        const page = parseInt(pageButton.dataset.page);
        await this.call({
          method: 'updatePage',
          params: { page }
        });
        return;
      }

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

    // Calculate pagination slice
    const startIndex = (state.ui.currentPage - 1) * state.config.pageSize;
    const endIndex = startIndex + state.config.pageSize;
    const paginatedRows = state.data.rows.slice(startIndex, endIndex);

    return `
        <tbody class="divide-y divide-gray-700">
            ${paginatedRows.map(row => `
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

  renderPagination(state) {
    const totalPages = Math.ceil(state.data.totalRows / state.config.pageSize);
    const pages = this.getPaginationRange(state.ui.currentPage, totalPages);

    return `
      <div class="flex justify-between items-center mt-4">
        <div class="text-sm text-gray-400">
          Showing ${(state.ui.currentPage - 1) * state.config.pageSize + 1} 
          to ${Math.min(state.ui.currentPage * state.config.pageSize, state.data.totalRows)}
          of ${state.data.totalRows} results
        </div>
        <div class="flex gap-1">
          ${pages.map(page => `
            <button 
              class="btn-control ${page === state.ui.currentPage ? 'bg-blue-600 text-white' : ''}"
              ${typeof page === 'number' ? `data-page="${page}"` : ''}
            >
              ${page}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  getPaginationRange(current, total) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);
    
    for (let i = current - delta; i <= current + delta; i++) {
      if (i < total && i > 1) {
        range.push(i);
      }
    }
    
    range.push(total);

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }
}

window.CoreClientModule.define(TableModule);
