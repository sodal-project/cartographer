class PersonaTableModule extends window.CoreClientModule {
  static moduleName = 'persona-table';

  updateUI(state) {
    this.renderComponent({
      html: `
        <div class="p-8">
          <div class="relative">
            <!-- Export CSV -->
            <form
              class="absolute z-10 right-10 top-1 pr-1 pt-px"
              hx-ext="download-csv"
              hx-post="/mod/exportCsv/download/download"
            >
              <input type="hidden" name="csvFilter" value='${JSON.stringify(state.graphFilters || [])}'>
              <button class="text-white" type="submit">
                <div class="w-5 h-5 text-gray-500 hover:text-white">
                  <!-- Download icon SVG here -->
                </div>
              </button>
            </form>

            <!-- Table Controls -->
            <div class="relative flex mb-4">
              <!-- Sort Dropdown -->
              <div class="relative border-r border-gray-700 pr-4" data-dropdown="sort">
                <button
                  class="flex gap-1 items-center inline-block h-7 px-3 rounded-full border border-indigo-500 text-indigo-400 bg-indigo-900 bg-opacity-30"
                  type="button"
                  data-dropdown-toggle="sort"
                >
                  <span class="relative h-3.5 text-indigo-400 inline-block">
                    ${state.sortDirection === 'ASC' ? '↑' : '↓'}
                  </span>
                  <span class="text-sm capitalize">${state.sortField}</span>
                  <span class="relative w-3.5 h-3.5 text-indigo-400 inline-block">▼</span>
                </button>

                <div
                  class="absolute z-10 top-9 left-1/2 w-96 border border-gray-700 bg-gray-800 shadow-xl rounded-lg p-5 hidden"
                  data-dropdown-content="sort"
                >
                  <div class="flex gap-3 items-center w-full">
                    <select name="sortField" class="bg-gray-900 text-white rounded p-2">
                      ${state.fields?.map(field => `
                        <option value="${field.value}" ${field.value === state.sortField ? 'selected' : ''}>
                          ${field.label}
                        </option>
                      `).join('')}
                    </select>
                    <select name="sortDirection" class="bg-gray-900 text-white rounded p-2">
                      ${state.sortDirections?.map(dir => `
                        <option value="${dir.value}" ${dir.value === state.sortDirection ? 'selected' : ''}>
                          ${dir.label}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="mt-4">
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded" data-action="save-sort">
                      Save
                    </button>
                  </div>
                </div>
              </div>

              <!-- Active Filters -->
              <div class="flex">
                ${state.filters?.map(filter => this.renderFilter(filter, state)).join('')}
              </div>

              <!-- Add Filter Button -->
              <div class="relative ml-2" data-dropdown="new-filter">
                <button
                  class="inline-block h-7 px-2 text-gray-500 text-sm rounded-md hover:bg-gray-800"
                  data-dropdown-toggle="new-filter"
                >
                  + Add filter
                </button>

                <div
                  class="absolute z-10 top-9 left-1/2 w-96 border border-gray-700 bg-gray-800 shadow-xl rounded-lg p-5 hidden"
                  data-dropdown-content="new-filter"
                >
                  <!-- New Filter Form -->
                  <div class="flex gap-3 items-center w-full mb-3">
                    <select name="filterNewField" class="bg-gray-900 text-white rounded p-2">
                      ${state.fields?.map(field => `
                        <option value="${field.value}">${field.label}</option>
                      `).join('')}
                    </select>
                    <select name="filterNewOperator" class="bg-gray-900 text-white rounded p-2">
                      ${state.filterOperators?.map(op => `
                        <option value="${op.value}">${op.label}</option>
                      `).join('')}
                    </select>
                  </div>
                  <input type="text" name="filterNewValue" class="text-white text-sm bg-gray-900 border border-gray-700 rounded-md p-2 px-3 w-full" />
                  <div class="mt-4">
                    <button class="bg-indigo-600 text-white px-4 py-2 rounded" data-action="save-new-filter">
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-scroll">
              <table class="min-w-full">
                <thead class="sticky top-0">
                  <tr>
                    <th class="sticky top-0 p-4 bg-gray-900 text-left w-12">
                      <div class="absolute bottom-0 left-0 right-0 border-b border-gray-700"></div>
                      <input
                        type="checkbox"
                        data-select-all
                        ${state.selectedUpns?.length === state.rows?.length ? 'checked' : ''}
                      >
                    </th>
                    ${state.fields?.map(field => `
                      <th class="sticky top-0 py-4 text-left text-sm font-semibold bg-gray-900 text-white">
                        <div class="absolute bottom-0 left-0 right-0 border-b border-gray-700"></div>
                        ${field.label}
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                  ${state.rows?.map(row => `
                    <tr class="hover:bg-indigo-600 hover:bg-opacity-20">
                      <td class="p-4">
                        <input 
                          type="checkbox"
                          value="${row.upn}"
                          name="upn"
                          ${state.selectedUpns?.includes(row.upn) ? 'checked' : ''}
                        >
                      </td>
                      ${Object.values(row).map(value => `
                        <td class="whitespace-nowrap p-4 pl-0 text-sm font-medium text-white">
                          ${value}
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <!-- Count -->
          <div class="text-gray-500 text-sm mt-4">
            Showing ${state.rows?.length} of ${state.totalCount} results
          </div>
        </div>
      `
    });
  }

  renderFilter(filter, state) {
    return `
      <div class="relative filter-ui" data-dropdown="filter-${filter.field}">
        <button
          class="flex gap-1 items-center inline-block h-7 px-3 ml-4 rounded-full border border-gray-700 text-sm text-gray-500 bg-gray-900 bg-opacity-30 hover:bg-gray-800"
          data-dropdown-toggle="filter-${filter.field}"
        >
          <span class="capitalize">${filter.field}</span>
          <span class="relative w-3.5 h-3.5 text-gray-500 inline-block">▼</span>
        </button>

        <div
          class="absolute z-10 top-9 left-1/2 w-96 border border-gray-700 bg-gray-800 shadow-xl rounded-lg p-5 hidden"
          data-dropdown-content="filter-${filter.field}"
        >
          <div class="flex gap-3 items-center w-full mb-3">
            <select name="filterField" class="bg-gray-900 text-white rounded p-2">
              ${state.fields?.map(field => `
                <option value="${field.value}" ${field.value === filter.field ? 'selected' : ''}>
                  ${field.label}
                </option>
              `).join('')}
            </select>
            <select name="filterOperator" class="bg-gray-900 text-white rounded p-2">
              ${state.filterOperators?.map(op => `
                <option value="${op.value}" ${op.value === filter.operator ? 'selected' : ''}>
                  ${op.label}
                </option>
              `).join('')}
            </select>
          </div>
          <input
            type="text"
            name="filterValue"
            value="${filter.value}"
            class="text-white text-sm bg-gray-900 border border-gray-700 rounded-md p-2 px-3 w-full"
          />
          <div class="flex justify-between w-full mt-4">
            <button
              class="bg-indigo-600 rounded text-white text-sm p-1 px-6"
              data-action="update-filter"
              data-field="${filter.field}"
            >
              Save
            </button>
            <button
              class="p-1 px-6 rounded text-white text-sm bg-gray-600"
              data-action="remove-filter"
              data-field="${filter.field}"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setupEvents() {
    console.log('Setting up events');

    // Sort button click
    this.addEventListener('click', 'button[data-action="save-sort"]', () => {
      console.log('Sort button clicked');
      const sortField = this.shadowRoot.querySelector('select[name="sortField"]').value;
      const sortDirection = this.shadowRoot.querySelector('select[name="sortDirection"]').value;
      
      console.log(`Sort field: ${sortField}, Sort direction: ${sortDirection}`);
      
      this.call({
        method: 'update',
        params: { 
          sortField,
          sortDirection
        }
      });
      
      this.closeAllDropdowns();
    });

    // Add filter button click
    this.addEventListener('click', 'button[data-action="save-new-filter"]', () => {
      console.log('Add filter button clicked');
      const field = this.shadowRoot.querySelector('select[name="filterNewField"]').value;
      const operator = this.shadowRoot.querySelector('select[name="filterNewOperator"]').value;
      const value = this.shadowRoot.querySelector('input[name="filterNewValue"]').value;

      console.log(`Filter field: ${field}, Operator: ${operator}, Value: ${value}`);

      this.call({
        method: 'addFilter',
        params: { field, operator, value }
      });

      this.closeAllDropdowns();
    });

    // Update filter button clicks
    this.addEventListener('click', 'button[data-action="update-filter"]', (e, button) => {
      console.log('Update filter button clicked');
      const filterField = button.getAttribute('data-field');
      const filterElement = this.shadowRoot.querySelector(`[data-dropdown="filter-${filterField}"]`);
      
      const field = filterElement.querySelector('select[name="filterField"]').value;
      const operator = filterElement.querySelector('select[name="filterOperator"]').value;
      const value = filterElement.querySelector('input[name="filterValue"]').value;

      console.log(`Updating filter - Field: ${field}, Operator: ${operator}, Value: ${value}`);

      const filterIndex = this.state.filters.findIndex(f => f.field === filterField);

      this.call({
        method: 'updateFilter',
        params: { 
          index: filterIndex,
          field,
          operator,
          value
        }
      });

      this.closeAllDropdowns();
    });

    // Remove filter button clicks
    this.addEventListener('click', 'button[data-action="remove-filter"]', (e, button) => {
      console.log('Remove filter button clicked');
      const filterField = button.getAttribute('data-field');
      const filterIndex = this.state.filters.findIndex(f => f.field === filterField);

      console.log(`Removing filter at index: ${filterIndex}`);

      this.call({
        method: 'removeFilter',
        params: { index: filterIndex }
      });

      this.closeAllDropdowns();
    });

    // Dropdown toggle buttons
    this.addEventListener('click', '[data-dropdown-toggle]', (e, button) => {
      const dropdownId = button.getAttribute('data-dropdown-toggle');
      console.log(`Toggling dropdown: ${dropdownId}`);
      this.toggleDropdown(dropdownId);
    });

    // Click outside to close dropdowns
    this.shadowRoot.addEventListener('click', (e) => {
      const isClickInsideDropdown = e.target.closest('[data-dropdown-content]') || e.target.closest('[data-dropdown-toggle]');
      if (!isClickInsideDropdown) {
        console.log('Click outside detected, closing all dropdowns');
        this.closeAllDropdowns();
      }
    });

    // Selection handling
    this.addEventListener('change', 'input[type="checkbox"][name="upn"]', (e) => {
      const { checked, value } = e.target;
      console.log(`Checkbox changed - UPN: ${value}, Checked: ${checked}`);
      this.call({
        method: 'updateSelectedUpns',
        params: {
          upn: value,
          action: checked ? 'add' : 'remove'
        }
      });
    });

    // Select all handling
    this.addEventListener('change', 'input[type="checkbox"][data-select-all]', (e) => {
      console.log(`Select all checkbox changed - Checked: ${e.target.checked}`);
      this.call({
        method: 'updateAllSelectedUpns',
        params: {
          selected: e.target.checked
        }
      });
    });
  }

  closeAllDropdowns() {
    console.log('Closing all dropdowns');
    this.shadowRoot.querySelectorAll('[data-dropdown-content]').forEach(d => {
      d.classList.add('hidden');
    });
  }

  toggleDropdown(id) {
    console.log(`Toggling dropdown with ID: ${id}`);
    const dropdowns = this.shadowRoot.querySelectorAll('[data-dropdown-content]');
    dropdowns.forEach(d => {
      if (d.getAttribute('data-dropdown-content') === id) {
        d.classList.toggle('hidden');
      } else {
        d.classList.add('hidden');
      }
    });
  }
}

window.CoreClientModule.define(PersonaTableModule);