const core = require('../../core/core.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(formData) {
  const data = {
    tableData: {
      sortProperty: 'name',
      sortDirection: 'descending',
      sortDirections: [
        {
          label: 'Ascending',
          value: 'ascending',
        },
        {
          label: 'Descending',
          value: 'descending',
        },
      ],
      filters: [
        {
          property: 'name',
          condition: 'is',
          value: 'John',
        },
        {
          property: 'city',
          condition: 'contains',
          value: 'Anytown',
        },
      ],
      filterConditions: [
        {
          label: 'Is',
          value: 'is',
        },
        {
          label: 'Is Not',
          value: 'is-not',
        },
        {
          label: 'Contains',
          value: 'contains',
        },
        {
          label: 'Not Contains',
          value: 'not-contains',
        },
        {
          label: 'Starts With',
          value: 'starts-with',
        },
        {
          label: 'Ends With',
          value: 'ends-with',
        },
        {
          label: 'Empty',
          value: 'not-empty',
        },
      ],
      properties: [
        {
          label: 'ID',
          value: 'id',
        },
        {
          label: 'Name',
          value: 'name',
        },
        {
          label: 'Phone',
          value: 'phone',
        },
        {
          label: 'Street',
          value: 'street',
        },
        {
          label: 'City',
          value: 'city',
        },
        {
          label: 'State',
          value: 'state',
        },
        {
          label: 'Zip',
          value: 'zip',
        },
      ],
      rows: [
        { id: 1, name: 'John Doe', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
        { id: 2, name: 'Jane Doe', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
        { id: 3, name: 'John Smith', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
        { id: 4, name: 'Jane Smith', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
      ],
    }
  }
  
  if (formData) {
    data.tableData.sortDirection = formData.sortDirection;
    data.tableData.sortProperty = formData.sortProperty;
    
    // Ensure that formData properties are always arrays
    const properties = Array.isArray(formData.filterProperty) ? formData.filterProperty : [formData.filterProperty];
    const conditions = Array.isArray(formData.filterCondition) ? formData.filterCondition : [formData.filterCondition];
    const terms = Array.isArray(formData.filterTerm) ? formData.filterTerm : [formData.filterTerm];

    // Initialize the filters array
    const filters = [];

    // Loop through properties and add valid entries to filters
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const condition = conditions[i];
      const value = terms[i];

      // Only add if none of the values are undefined
      if (property !== undefined && condition !== undefined && value !== undefined) {
        filters.push({ property, condition, value });
      }
    }

    // Check for new filter
    if (formData.filterNewProperty && formData.filterNewCondition && formData.filterNewTerm) {
      filters.push({
        property: formData.filterNewProperty,
        condition: formData.filterNewCondition,
        value: formData.filterNewTerm,
      });
    }
    
    // Update the filters array
    data.tableData.filters = [ ...filters ];

    // Check for visibility
    if (formData.visibility) {
      data.tableData.visibility = formData.visibility;
    }
  }

  return core.client.render('index.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function index() {
  return redraw();
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function filter(formData) {
  return redraw(formData);
}

/**
 * Initialize the module
 */
async function init() {
  // nothing to do
}

module.exports = {
  index,
  filter,
  init,
};
