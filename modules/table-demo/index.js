const core = require('../../core/core.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(formData) {
  const exampleTableConfig = {
    sortProperty: "upn",
    sortDirection: "ASC",
    filterNewProperty: "platform",
    filterNewTerm: "directory",
    filterNewCondition: "is",
  }

  const data = {
    tableData: await core.personaTable.read(exampleTableConfig),
  }

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

  const data = {
    tableData: await core.personaTable.read(formData),
    endpoint: '/mod/table-demo/filter/'
  }

  return core.client.render('table.hbs', data);
}

module.exports = {
  index,
  filter,
};
