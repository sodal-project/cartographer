const core = require('../../core/core.js');
const { tableDataPrep } = require('../../core/utilities.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(formData) {
  const rows = [
    { id: 1, name: 'John Doe', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
    { id: 2, name: 'Jane Doe', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
    { id: 3, name: 'John Smith', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
    { id: 4, name: 'Jane Smith', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
  ];

  // Prepare the data for the table component
  // TODO: Is there a better place to store this function or way to do this?
  const data = tableDataPrep(rows, formData);

  // Render the index.hbs template
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
  const rows = [
    { id: 1, name: 'John Doe', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
    { id: 2, name: 'Jane Doe', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
    { id: 3, name: 'John Smith', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
    { id: 4, name: 'Jane Smith', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
  ];

  const data = tableDataPrep(rows, formData);
  data.endpoint = '/mod/table-demo/filter/'

  return core.client.render('table.hbs', data);
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
