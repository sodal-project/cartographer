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
 * @description Write merge an object to the module namespace of MongoDb, existing properties will be overwritten.
 * @param {object} formData - The data to write to the config file
 * @returns {string} - Compiled HTML content
 */
async function writeConfig(formData) {
  const newProperty = {
    [formData.key]: formData.value,
  };
  const response = await core.config.writeConfig(newProperty);
  return redraw();
}

/**
 * @description Delete a property from the module namespace in MongoDb.
 * @param {object} formData - An object with a delete property whose value is the property to delete
 * @returns {string} - Compiled HTML content
 */
async function deleteConfig(formData) {
  const response = await core.config.deleteConfig(formData.value);
  return redraw();
}

/**
 * Initialize the module
 */
async function init() {
  // no action to take
}

module.exports = {
  init,
  index,
  writeConfig,
  deleteConfig,
};
