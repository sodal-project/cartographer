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

  try {
    results = await core.graph.readPersonas(formData.filter);
  } catch (error) {
    results = error;
  }

  return redraw({ 
    filter: formData.filter,
    results, 
  });
}

module.exports = {
  index,
  runFilter,
};
