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
  const response = await core.config.writeConfig({[`table-config-${tableFormId}`]: { selectedUpns: newSelectedUpns }});
  
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
    hx-vals='{"upn": "${upn}", "action": "${newAction}", "tableFormId": "personaTable" }'
    ${newAction === 'remove' ? 'checked' : ''}
  />`
  return newCheckbox;
}

module.exports = {
  mainPane,
  build,
  update,
  init,
  updateSelectedUpns,
};
