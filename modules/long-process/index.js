const core = require('../../core/core.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw() {
  const data = await core.config.readConfig();
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

/**
 * Start a long running process or report on the status of a long running process.
 * 
 * @param {object} data - An object with a delete property whose value is the property to delete
 * @returns {object} - A message string and the data object with the property to delete
 */
async function longProcess() {
  const data = await core.config.readConfig() || {};

  // Default to ready if no processStatus is set
  const status = data.status || 'ready'

  // Simulate a long running process 
  if (status === 'ready') {
    await core.config.writeConfig({ status: 'running' });
    setTimeout(async () => {
      await core.config.writeConfig({ status: 'ready' });
    }, 15000);
  }
  return redraw();
}

module.exports = {
  index,
  longProcess,
};
