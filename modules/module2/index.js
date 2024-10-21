const core = require('../../core/core.js');

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function index() {
  const data = await core.readConfig();
  return core.render('index.hbs', data);
}

/**
 * @description Write merge an object to the module namespace of MongoDb, existing properties will be overwritten.
 * @param {object} formData - The data to write to the config file
 * @returns {string} - Compiled HTML content
 */
async function writeConfig(formData) {
  const response = await core.writeConfig(formData);
  const data = await core.readConfig();
  return core.render('index.hbs', data);
}

/**
 * @description Delete a property from the module namespace in MongoDb.
 * @param {object} formData - An object with a delete property whose value is the property to delete
 * @returns {string} - Compiled HTML content
 */
async function deleteConfig(formData) {
  const response = await core.deleteConfig(formData.delete);
  const data = await core.readConfig();
  return core.render('index.hbs', data);
}

module.exports = {
  index,
  writeConfig,
  deleteConfig,
};
