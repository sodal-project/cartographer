const core = require('../../core/core.js');
const table = require('./table.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(formData) {

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

async function build(form){
  return table.build(form);
}

async function update(form){
  return table.update(form);
}

async function init(){
  await core.client.registerPartials();
}

module.exports = {
  index,
  build,
  update,
  init,
};
