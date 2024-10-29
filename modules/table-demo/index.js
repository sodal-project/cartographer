const core = require('../../core/core.js');

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function index() {
  const data = {
    tableData: {
      columns: ['ID', 'Name', 'Phone', 'Street', 'City', 'State', 'Zip'],
      rows: [
        { id: 1, name: 'John Doe', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
        { id: 2, name: 'Jane Doe', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
        { id: 3, name: 'John Smith', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
        { id: 4, name: 'Jane Smith', phone: '555-555-5555', street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
      ],
    }
  } 

  return core.render('index.hbs', data);
}


module.exports = {
  index,
};
