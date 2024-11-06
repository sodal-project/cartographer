const core = require('../../core/core.js');

const directoryPreFilter = [{
  type: "field",
  key: "platform",
  value: "directory",
  operator: "=",
  not: false
}]

const personaPreFilter = [{
  type: "field",
  key: "type",
  value: "participant",
  operator: "=",
  not: true
}]

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(formData) {

/*   const directoryTableConfig = {
    sortProperty: "upn",
    sortDirection: "ASC",
    filterNewProperty: "platform",
    filterNewTerm: "directory",
    filterNewCondition: "is",
  }

  const personaTableConfig = {
    sortProperty: "upn",
    sortDirection: "ASC",
    filterNewProperty: "type",
    filterNewTerm: "participant",
    filterNewCondition: "is-not",
  } */

  const directory = await core.personaTable.fromTableForm(null, directoryPreFilter);
  const personas = await core.personaTable.fromTableForm(null, personaPreFilter);

  const data = {
    directory: { tableData: directory },
    personas: { tableData: personas },
  };

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
async function filterdirectory(formData) {

  console.log('formData', formData)

  const data = {
    tableData: await core.personaTable.fromTableForm(formData, directoryPreFilter),
    endpoint: '/mod/directory/filterdirectory/'
  }

  return core.client.render('table-directory.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function filterpersonas(formData) {

  console.log('formData', formData)

  const data = {
    tableData: await core.personaTable.fromTableForm(formData, personaPreFilter),
    endpoint: '/mod/directory/filterpersonas/'
  }

  return core.client.render('table-personas.hbs', data);
}

module.exports = {
  index,
  filterdirectory,
  filterpersonas,
};
