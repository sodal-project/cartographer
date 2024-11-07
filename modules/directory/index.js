const core = require('../../core/core.js');
const { tableDataPrep } = require('../../core/utilities.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(formData) {
  const directoryRows = [
    { upn: 1, name: 'John Doe', platform: 'Slack', type: 'Directory' },
    { upn: 2, name: 'Jane Doe', platform: 'Slack', type: 'Directory' },
    { upn: 3, name: 'John Smith', platform: 'Slack', type: 'Directory' },
    { upn: 4, name: 'Jane Smith', platform: 'Slack', type: 'Directory' },
  ];
  const personaRows = [
    { upn: 1, name: 'John Doe', platform: 'Slack', type: 'Persona' },
    { upn: 2, name: 'Jane Doe', platform: 'Slack', type: 'Persona' },
    { upn: 3, name: 'John Smith', platform: 'Slack', type: 'Persona' },
    { upn: 4, name: 'Jane Smith', platform: 'Slack', type: 'Persona' },
  ];

  // Prepare the data for the table component
  // TODO: Is there a better place to store this function or way to do this?
  const directory = tableDataPrep(directoryRows, formData);
  const personas = tableDataPrep(personaRows, formData);
  const data = {
    directory: directory,
    personas: personas,
  };

  console.log('data', data)

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
  const directoryRows = [
    { upn: 1, name: 'John Doe', platform: 'Slack', type: 'Directory' },
    { upn: 2, name: 'Jane Doe', platform: 'Slack', type: 'Directory' },
    { upn: 3, name: 'John Smith', platform: 'Slack', type: 'Directory' },
    { upn: 4, name: 'Jane Smith', platform: 'Slack', type: 'Directory' },
  ];

  const data = tableDataPrep(directoryRows, formData);
  data.endpoint = '/mod/directory/filterdirectory/'

  return core.client.render('table-directory.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function filterpersonas(formData) {
  const personaRows = [
    { upn: 1, name: 'John Doe', platform: 'Slack', type: 'Persona' },
    { upn: 2, name: 'Jane Doe', platform: 'Slack', type: 'Persona' },
    { upn: 3, name: 'John Smith', platform: 'Slack', type: 'Persona' },
    { upn: 4, name: 'Jane Smith', platform: 'Slack', type: 'Persona' },
  ];

  const data = tableDataPrep(personaRows, formData);
  data.endpoint = '/mod/directory/filterpersonas/'

  return core.client.render('table-personas.hbs', data);
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
 * Initialize the module
 */
async function init() {
  // nothing to do
}

module.exports = {
  index,
  filterdirectory,
  filterpersonas,
  addPersona,
  addActivity,
  init,
};
