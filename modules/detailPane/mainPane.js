const core = require('../../core/core.js');

/**
 * @description Fetch data from the config database namespace and render the mainPane.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(data = {}) {
  return core.client.render('mainPane.hbs', data);
}

async function getNameFromPersona(persona) {
  let name = '';
  if (persona.firstName || persona.lastName) {
    name = `${persona.firstName} ${persona.lastName}`;
  } else if (persona.friendlyName) {
    name = persona.friendlyName;
  } else if (persona.id) {
    name = persona.id;
  }

  return name;
}

async function getSubpanesFromUpn(upn) {
  const subpanes = [];

  // Call all module getDetailSubpane functions
  for (const module of Object.keys(core.mod)) {
    if (core.mod[module].getDetailSubpane) {
      subpanes.push(await core.mod[module].getDetailSubpane(upn));
    }
  }

  return subpanes
}

async function buildConfig(upn = "upn:directory:participant:p0001") {
  const persona = await core.graph.readPersona(upn);

  // Persona was not found
  if (!persona) {
    console.error(`Persona not found for upn: ${upn}`);
    return {};
  }

  // Get Name and Subpanes
  const name = await getNameFromPersona(persona);
  const subpanes = await getSubpanesFromUpn(upn);
  
  const config = {
    upn,
    name,
    subpanes,
  }

  return config;
}

// PUBLIC

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function mainPane() {
  const config = await buildConfig();
  // return redraw(config);
  return core.client.render('mainPane.hbs', {});
}

async function search(formData) {
  const config = await buildConfig(formData.upn.trim());
  return redraw(config);
}

module.exports = {
  mainPane,
  search,
};
