const core = require('../../core/core.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(data) {
  return core.client.render('index.hbs', data);
}

// PUBLIC

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function index() {
  return redraw();
}

async function runFilter(formData) {
  let results = null;
  const filter = JSON.parse(formData.filter);

  try {
    response = await core.graph.readAgents(filter);
    const sortedUpns = response.records.map(node => node._fields[0].properties.upn);
    results = sortedUpns;
  } catch (error) {
    results = error;
  }

  return redraw({ 
    filter: formData.filter, // JSON.stringify(filter),
    results, 
  });
}

module.exports = {
  index,
  runFilter,
};
