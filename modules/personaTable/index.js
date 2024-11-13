const core = require('../../core/core.js');
const table = require('./table.js');

/**
 * @description Render the Persona Table index page
 * 
 * @param {object} formData - Form data from a Persona Table
 * @returns {string} - Compiled HTML content
 */
async function redraw(formData) {

  // Example configuration
  const tableConfig = {
    tableFormId: 'personaTable',
    action: {
      label: "Reload",
      endpoint: "/mod/personaTable/index",
    }
  }

  const data = {
    tableData: await table.build(tableConfig),
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
 * @description Build a Persona Table from a TableConfig object
 * 
 * @param {object} form - The TableConfig object required to build a table
 * @returns {object} - The TableData object required to render a table
 */
async function build(form){
  return table.build(form);
}

/**
 * @description Update a Persona Table with new data
 * 
 * @param {object} form - The TableForm object required to update a table
 * @returns {object} - The TableData object required to render a table
 */
async function update(form){
  return table.update(form);
}

/**
 * @description Initialize the module
 * 
 * Register PersonaTable partials
 * 
 * @returns {void}
 */
async function init(){
  await core.client.registerPartials();
}

module.exports = {
  index,
  build,
  update,
  init,
};
