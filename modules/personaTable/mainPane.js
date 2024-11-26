const core = require('../../core/core.js');
const table = require('./personaTable.js');

/**
 * @description Render the Persona Table main pane
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
      endpoint: "/mod/personaTable/mainPane",
    }
  }

  const data = {
    tableData: await table.build(tableConfig),
  }

  // Render the main template
  return core.client.render('mainPane.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function mainPane() {
  return redraw();
}

/**
 * @description Get the table HTML for a given configuration
 * 
 * @param {*} config 
 * @returns {string} - Compiled HTML content
 */
async function getTable(config) {
  const data = {
    tableData: await table.build(config),
  }

  // Render the main template
  return core.client.render('mainPane.hbs', data);
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
 * @description Add the passed UPN to the selected UPNs list in the config 
 * database and return a new checkbox
 * 
 * @param {*} data - The data object containing the upn, action, and tableFormId
 * @returns {string} - Compiled HTML containing a new checkbox
 */
async function updateSelectedUpns(data){
  const {upn, action, tableFormId} = data;
  
  // Get the current selectedUpns
  const tableConfig = await core.config.readConfig(`table-config-${tableFormId}`) || {};
  const selectedUpns = tableConfig.selectedUpns || [];

  // Update the selectedUpns
  let newSelectedUpns;
  if (action === 'add') {
    newSelectedUpns = [...selectedUpns, upn];
  } else {
    newSelectedUpns = selectedUpns.filter(item => item !== upn);
  }

  // Update the table config with the new selectedUpns
  tableConfig.selectedUpns = newSelectedUpns;

  // Write the updated selectedUpns to the database
  const response = await core.config.writeConfig({[`table-config-${tableFormId}`]: tableConfig});
  
  // Set the next action depending on the reponse
  // if this fails we should return a checkbox with the existing action
  let newAction = action;
  if (response === true) {
    newAction = action === 'remove' ? 'add' : 'remove';
  }

  // Return a new checkbox with the updated action and checked state
  const newCheckbox = `<input 
    type="checkbox" 
    name="upn" 
    value="${upn}"
    hx-post="/mod/personaTable/updateSelectedUpns/"
    hx-trigger="change"
    hx-target="closest .checkbox-wrap"
    hx-vals='{"upn": "${upn}", "action": "${newAction}", "tableFormId": "${tableFormId}" }'
    ${newAction === 'remove' ? 'checked' : ''}
  />`
  return newCheckbox;
}

/**
 * @description Add the passed UPNs to the selected UPNs list in the config 
 * database and redraw the entire table
 * 
 * @param {*} data - The data object containing the upn, action, and tableFormId
 * @returns {string} - Compiled HTML containing a new checkbox
 */
async function updateAllSelectedUpns(data){
  const {tableFormId, upns} = data;
  
  // Get the existing table config and update it's UPNs
  const tableConfig = await core.config.readConfig(`table-config-${tableFormId}`) || {};
  tableConfig.selectedUpns = upns;

  // Write the updated table config to the database
  const response = await core.config.writeConfig({[`table-config-${tableFormId}`]: tableConfig});
  
  return redraw();
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
  mainPane,
  build,
  update,
  init,
  updateSelectedUpns,
  updateAllSelectedUpns,
  getTable,
};
