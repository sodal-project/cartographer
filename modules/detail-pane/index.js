const core = require('../../core/core.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(data = {}) {
  return core.client.render('index.hbs', data);
}

async function buildConfig() {
  const upn = "upn:directory:participant:p0001";
  
  // Get Persona Data
  const persona = await core.graph.readPersonaObject(upn);

  console.log('Persona from detail pane:', persona);

  // TODO: handle persona not found

  const friendlyName = "Andy";
  const subpanes = [];

  // Call all module getDetailSubpane functions
  for (const module of Object.keys(core.mod)) {
    if (core.mod[module].getDetailSubpane) {
      subpanes.push(await core.mod[module].getDetailSubpane(upn));
    }
  }

  const config = {
    upn,
    friendlyName,
    subpanes,
  }

  return config;
}

// PUBLIC

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function index() {
  const config = await buildConfig();
  return redraw(config);
}

async function getDetails(formData) {
  console.log('The upn is', formData.upn);

  const config = await buildConfig();
  return redraw(config);
}

module.exports = {
  index,
  getDetails,
};
