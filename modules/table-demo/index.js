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
        {
          property: 'state',
          condition: 'contains',
          value: 'Minnesota',
        }
      ],
      filterConditions: [
        {
          label: 'is',
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
    console.log('filter property', formData['filter-property']);
    const filters = formData['filter-property'].map((property, index) => ({
      property,
      condition: formData['filter-condition'][index],
      value: formData['filter-term'][index],
    }));
    data.tableData.sortDirection = formData['sort-direction'];
    data.tableData.sortProperty = formData['sort-property'];
    data.tableData.filters = [ ...filters ];
    console.log('Form Data', formData)
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
  console.log('table demo initialized');
}


module.exports = {
  index,
  filter,
  init,
};
