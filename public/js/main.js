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

  // Reinitialize Alpine components after an HTMX request as the dom has changed
  Alpine.initTree(document.body);
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
      console.log('Initialized selected:', this.selected);
    },

    initializeTotalCheckboxes() {
      // Set `totalCheckboxes` based on the number of rows in the tbody
      this.totalCheckboxes = document.querySelectorAll('tbody tr').length;
    },

    toggleSelectAll() {
      this.selectAll = !this.selectAll;
      this.selected = this.selectAll
        ? Array.from(document.querySelectorAll('tbody input[type="checkbox"]')).map(cb => cb.value)
        : [];
      this.updateSelectAllState();
    },

    updateSelectAllState() {
      console.log('Updating select all state');
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
