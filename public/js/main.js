import { CoreClientModule } from './CoreClientModule.js';
import { realtime } from './realtime.js';

// Export for browser usage
window.CoreClientModule = CoreClientModule;
window.realtime = realtime;

let spinnerTimeout;

// Show the spinner after 1 second if the request is still in progress
document.body.addEventListener('htmx:beforeRequest', (event) => {
  spinnerTimeout = setTimeout(() => {
    document.getElementById('spinner').style.visibility = 'visible';
    document.getElementById('main').style.visibility = 'hidden';
  }, 300);
});

// Hide the spinner and clear the timeout immediately after the request is finished
document.body.addEventListener('htmx:afterRequest', (event) => {
  // Cancel showing the spinner if request finishes quickly
  clearTimeout(spinnerTimeout);
  document.getElementById('spinner').style.visibility = 'hidden';
  document.getElementById('main').style.visibility = 'visible';

  // Run the init function for components that need to be re-initialized
  PersonaTable.init();
});

// Initial Page Load
document.addEventListener('DOMContentLoaded', () => {
  PersonaTable.init();
});

/**
 * Manages selection of checkboxes in a table component, including functionality to select all, none, or individual rows.
 *
 * @returns {Object} - An object containing properties and methods for checkbox management in a table.
 * @property {boolean} selectAll - A boolean indicating whether all checkboxes should be selected.
 * @property {Array<string>} selected - An array of selected row indices as strings.
 * @property {number} totalCheckboxes - The total number of checkboxes in the table.
 * @property {Function} initializeTotalCheckboxes - Initializes the total number of checkboxes based on the rows in the table body.
 * @property {Function} toggleSelectAll - Toggles the selection of all checkboxes in the table.
 * @property {Function} updateSelectAllState - Updates the `selectAll` state and manages the indeterminate state of the header checkbox.
 */
function tableCheckbox() {
  return {
    selectAll: false,
    selected: [],
    totalSelectedCheckboxes: 0,
    totalCheckboxes: 0,

    init() {
      // Find all pre-selected checkboxes and add them to the `selected` array
      this.selected = Array.from(this.$el.querySelectorAll('input[type="checkbox"][name="upn"]:checked')).map(input => input.value);
      
      // Set the total number of selected checkboxes
      this.totalSelectedCheckboxes = this.selected.length;

      // Set the total number of checkboxes
      this.totalCheckboxes = this.$el.querySelectorAll('input[type="checkbox"][name="upn"]').length;

      this.updateSelectAllState();
    },

    initializeTotalCheckboxes() {
      const table = this.$el.closest('table');
      this.totalCheckboxes = table.querySelectorAll('tbody tr').length;
    },

    toggleSelectAll() {
      // Get all the upns from the table
      const table = this.$el.closest('table');
      const checkboxes = table.querySelectorAll('input[type="checkbox"][name="upn"]');
      const allUpns = Array.from(checkboxes).map(checkbox => checkbox.value);

      // Determine the state of selection
      let upns = [];
      if (this.selected.length === 0) {
        upns = allUpns; // Select all if none are selected
      }

      // Set the `hx-vals` attribute on the header checkbox to send the upns as a parameter
      const existingVals = this.$refs.headerCheckbox.getAttribute('hx-vals');
      const updatedVals = {
        ...(existingVals ? JSON.parse(existingVals) : {}), // Parse existing values if present
        upns, // Add or overwrite the upns key
      };
      this.$refs.headerCheckbox.setAttribute('hx-vals', JSON.stringify(updatedVals));

      // Trigger the HTMX post
      this.$refs.headerCheckbox.dispatchEvent(new CustomEvent('htmx:configRequest', {
        detail: {
          headers: { 'Content-Type': 'application/json' },
          bubbles: true,
        },
      }));
    },

    updateSelectAllState() {
      const checkedCount = this.selected.length;
      this.selectAll = checkedCount === this.totalCheckboxes;
      
      // Set the `indeterminate` property directly on the header checkbox
      this.$refs.headerCheckbox.indeterminate = checkedCount > 0 && checkedCount < this.totalCheckboxes;
    }
  }
}

/**
 * Manages column visibility in a table based on a list of pre-checked columns.
 *
 * @param {Array<number>} preCheckedColumns - An array of column indices that should initially be hidden.
 * @returns {Object} - An object containing methods to manage column visibility.
 * @property {Array<number>} hiddenColumns - The indices of columns currently set to be hidden.
 * @property {Function} getColumnClasses - A function that returns a string of CSS class names for hiding columns, formatted as "hide-col-x".
 */
function columnVisibility(preCheckedColumns = []) {
  return {
    hiddenColumns: preCheckedColumns,
    getColumnClasses() {
      return this.hiddenColumns.map(col => `hide-col-${col}`).join(' ');
    }
  };
}



// PERSONA TABLE
// In the future we should move this to the module so that there is a pattern for authors
// to follow for adding javascript to their own modules.
const PersonaTable = {
  headerCheckboxChange(element) {
    const table = element.closest('table');
    const bodyCheckboxes = table.querySelectorAll('tbody input[type="checkbox"][name="upn"]');
    const checkedCheckboxes = table.querySelectorAll('tbody input[type="checkbox"][name="upn"]:checked');
    const allSelected = bodyCheckboxes.length === checkedCheckboxes.length;
    const allUpns = Array.from(bodyCheckboxes).map(checkbox => checkbox.value);

    // Get the hx-vals attribute from the header checkbox 
    const hxValsString = element.getAttribute('hx-vals');
    const hxVals = hxValsString ? JSON.parse(hxValsString) : {};

    // Update hx-vals with the upns
    if (allSelected) {
      hxVals.upns = [];
    } else {
      hxVals.upns = allUpns;
    }

    // Set the `hx-vals` attribute on the header checkbox to send the upns as a parameter
    element.setAttribute('hx-vals', JSON.stringify(hxVals));

    // Submit the htmx request
    element.dispatchEvent(new CustomEvent('htmx:configRequest', {
      detail: {
        headers: { 'Content-Type': 'application/json' },
        bubbles: true,
      },
    }));
  },
  init() {
    const table = document.querySelectorAll('.persona-table-wrap');
    
    // Update the checkbox in the header row to either be checked, unchecked, or indeterminate based on the state of the checkboxes in the body
    table.forEach((table) => {
      const headerCheckbox = table.querySelector('thead input[type="checkbox"]');
      const bodyCheckboxes = table.querySelectorAll('tbody input[type="checkbox"][name="upn"]');
      const checkedCheckboxes = table.querySelectorAll('tbody input[type="checkbox"][name="upn"]:checked');
      const actionWrap = table.querySelector('.action-wrap');
      const selectedCount = table.querySelector('[data-selected-count]');
      const totalCheckboxes = table.querySelectorAll('tbody input[type="checkbox"][name="upn"]:checked').length;

      // Set the header checkbox state
      headerCheckbox.checked = bodyCheckboxes.length === checkedCheckboxes.length;
      headerCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < bodyCheckboxes.length;
      
      // Some tables don't have the action wrap or selected count so we'll return if they're missing
      if (!actionWrap || !selectedCount) return;

      // Hide or show the action wrap
      actionWrap.classList.toggle('hidden', checkedCheckboxes.length === 0);

      // Update the selected count
      selectedCount.textContent = totalCheckboxes;
    });
  }
};
