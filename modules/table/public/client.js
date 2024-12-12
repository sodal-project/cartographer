class TableModule extends CoreClientModule {
  static moduleName = 'table';

  updateUI(state) {
    this.state = state; // Cache state locally
    this.renderComponent({
      html: `
        <div class="table-module p-4 bg-gray-900">
          <!-- Loading Overlay -->
          <div class="loading-overlay hidden">
            <div class="spinner"></div>
          </div>

          <!-- Error Message -->
          <div class="error-message hidden"></div>

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
    this.setupPaginationEvents();
    this.setupSortEvents();
    this.setupFilterEvents();
    this.setupSelectionEvents();
  }

  setupPaginationEvents() {
    this.shadowRoot.addEventListener('click', async (e) => {
      const pageButton = e.target.closest('[data-page]');
      if (!pageButton) return;
      
      const page = parseInt(pageButton.dataset.page);
      await this.call({
        method: 'updatePage',
        params: { page }
      });
    });
  }

  setupSortEvents() {
    this.shadowRoot.addEventListener('click', async (e) => {
      const sortButton = e.target.closest('[data-sort]');
      if (!sortButton) return;

      const field = sortButton.dataset.sort;
      const direction = this.state.ui.sort.field === field && 
                       this.state.ui.sort.direction === 'asc' ? 'desc' : 'asc';
      
      await this.call({
        method: 'updateSort',
        params: { field, direction }
      });
    });
  }

  setupFilterEvents() {
    // Handle filter removal
    this.shadowRoot.addEventListener('click', async (e) => {
      const removeFilter = e.target.closest('[data-remove-filter]');
      if (!removeFilter) return;

      const index = parseInt(removeFilter.dataset.removeFilter);
      await this.call({
        method: 'removeFilter',
        params: { index }
      });
    });

    // Handle filter form submission
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

  setupSelectionEvents() {
    this.shadowRoot.addEventListener('change', async (e) => {
      const checkbox = e.target.closest('[data-row-select]');
      if (!checkbox) return;

      const rowId = checkbox.dataset.rowSelect;
      const selectedRows = [...this.state.ui.selectedRows];

      if (checkbox.checked) {
        selectedRows.push(rowId);
      } else {
        const index = selectedRows.indexOf(rowId);
        if (index > -1) selectedRows.splice(index, 1);
      }

      await this.call({
        method: 'updateSelection',
        params: { selectedRows }
      });
    });
  }

  // Helper render methods
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
    return `
      <tbody class="divide-y divide-gray-700">
        ${state.data.rows.map(row => `
          <tr>
            ${state.config.columns.map(col => `
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                ${row[col.key]}
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

  // Add error and loading handling methods
  async call({ method, params }) {
    try {
      this.setLoading(true);
      const result = await super.call({ method, params });
      this.clearError();
      return result;
    } catch (error) {
      this.showError(error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    const overlay = this.shadowRoot.querySelector('.loading-overlay');
    if (isLoading) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  showError(message) {
    const errorDiv = this.shadowRoot.querySelector('.error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.clearError(), 5000);
  }

  clearError() {
    const errorDiv = this.shadowRoot.querySelector('.error-message');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
  }

  // Add cleanup in disconnectedCallback
  disconnectedCallback() {
    // Clear any pending timeouts
    if (this._errorTimeout) {
      clearTimeout(this._errorTimeout);
    }
    
    // Remove all event listeners
    if (this.shadowRoot) {
      const filterForm = this.shadowRoot.querySelector('.filter-form');
      if (filterForm) {
        filterForm.removeEventListener('submit', this._filterFormHandler);
      }
    }
    
    // Call parent cleanup
    super.disconnectedCallback();
  }
}

window.CoreClientModule.define(TableModule);
