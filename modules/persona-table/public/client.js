import { templates } from './templates.js';

class PersonaTableModule extends window.CoreClientModule {
  static moduleName = 'persona-table';

  updateUI(state) {
    this.renderComponent({
      html: templates.main(state)
    });
  }

  setupEvents() {
    // Sort button click
    this.addEventListener('click', 'button[data-action="save-sort"]', () => {
      const sortField = this.shadowRoot.querySelector('select[name="sortField"]').value;
      const sortDirection = this.shadowRoot.querySelector('select[name="sortDirection"]').value;
      
      this.call({
        method: 'update',
        params: { sortField, sortDirection }
      });
      
      this.closeAllDropdowns();
    });

    // Add filter button click
    this.addEventListener('click', 'button[data-action="save-new-filter"]', () => {
      const field = this.shadowRoot.querySelector('select[name="filterNewField"]').value;
      const operator = this.shadowRoot.querySelector('select[name="filterNewOperator"]').value;
      const value = this.shadowRoot.querySelector('input[name="filterNewValue"]').value;

      this.call({
        method: 'addFilter',
        params: { field, operator, value }
      });

      this.closeAllDropdowns();
    });

    // Update filter button clicks
    this.addEventListener('click', 'button[data-action="update-filter"]', (e, button) => {
      const filterField = button.getAttribute('data-field');
      const filterElement = this.shadowRoot.querySelector(`[data-dropdown="filter-${filterField}"]`);
      
      const field = filterElement.querySelector('select[name="filterField"]').value;
      const operator = filterElement.querySelector('select[name="filterOperator"]').value;
      const value = filterElement.querySelector('input[name="filterValue"]').value;

      const filterIndex = this.state.filters.findIndex(f => f.field === filterField);

      this.call({
        method: 'updateFilter',
        params: { index: filterIndex, field, operator, value }
      });

      this.closeAllDropdowns();
    });

    // Remove filter button clicks
    this.addEventListener('click', 'button[data-action="remove-filter"]', (e, button) => {
      const filterField = button.getAttribute('data-field');
      const filterIndex = this.state.filters.findIndex(f => f.field === filterField);

      this.call({
        method: 'removeFilter',
        params: { index: filterIndex }
      });

      this.closeAllDropdowns();
    });

    // Dropdown toggle buttons
    this.addEventListener('click', '[data-dropdown-toggle]', (e, button) => {
      const dropdownId = button.getAttribute('data-dropdown-toggle');
      this.toggleDropdown(dropdownId);
    });

    // Click outside to close dropdowns
    this.shadowRoot.addEventListener('click', (e) => {
      const isClickInsideDropdown = e.target.closest('[data-dropdown-content]') || e.target.closest('[data-dropdown-toggle]');
      if (!isClickInsideDropdown) {
        this.closeAllDropdowns();
      }
    });

    // Selection handling
    this.addEventListener('change', 'input[type="checkbox"][name="upn"]', (e) => {
      const { checked, value } = e.target;
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
      this.call({
        method: 'updateAllSelectedUpns',
        params: {
          selected: e.target.checked
        }
      });
    });
  }

  closeAllDropdowns() {
    this.shadowRoot.querySelectorAll('[data-dropdown-content]').forEach(d => {
      d.classList.add('hidden');
    });
  }

  toggleDropdown(id) {
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