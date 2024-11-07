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

  const directory = await core.personaTable.read(null, directoryPreFilter);
  const personas = await core.personaTable.read(null, personaPreFilter);

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

  const data = {
    tableData: await core.personaTable.read(formData, directoryPreFilter),
    filterEndpoint: '/mod/directory/filterdirectory/'
  }

  return core.client.render('table.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function filterpersonas(formData) {

  const data = {
    tableData: await core.personaTable.read(formData, personaPreFilter),
    filterEndpoint: '/mod/directory/filterpersonas/'
  }

  return core.client.render('table.hbs', data);
}

/**
 * Add a persona to the graph
 * @param {object} formData - The data from the form
 * @returns {string} - Compiled HTML content
 */
async function addPersona(formData) {
  const persona = { 
    firstName: formData.firstName,
    lastName: formData.lastName,
    handle: formData.handle,
  };
  console.log('add persona', persona);

  return redraw();
}

/**
 * Add an activity to the graph
 * @param {object} formData - The data from the form
 * @returns {string} - Compiled HTML content
 */
async function addActivity(formData) {
  const activity = { 
    name: formData.name,
  };
  console.log('add activity', activity);

  return redraw();
}

/**
 * Add a persona to the graph
 * @param {object} formData - The data from the form
 * @returns {string} - Compiled HTML content
 */
async function deletePersonas(formData) {
  console.log('delete persona', formData);

  return redraw();
}

module.exports = {
  index,
  filterdirectory,
  filterpersonas,
  addPersona,
  addActivity,
  deletePersonas
};
