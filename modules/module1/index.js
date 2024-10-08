const core = require('../../core/core.js');

/**
 * writeConfig
 * Write data to the module namespace of MongoDb. Multiple
 * properties can be passed in the data object.
 * 
 * @param {object} data - The data to write to the config file
 * @returns {object} - A message string and data object with all properties written
 */
async function writeConfig(data) {
  const response = await core.writeConfig(data);
  const message = response ? 'module 1 wrote config data' : 'module 1 failed to write config data';
  core.log(message, 'INFO');

  return {
    messages: message,
    data: data,
  }
}

/**
 * readConfig
 * Read the entire module namespace from MongoDb.
 * 
 * @returns {object} - A message string and an object with all properties in the module namespace
 */
async function readConfig() {
  const data = await core.readConfig();
  
  return {
    messages: 'module 1 read config data',
    data: data
  }
}

/**
 * deleteConfig
 * Delete a property from the module namespace in MongoDb.
 * 
 * @param {object} data - An object with a delete property whose value is the property to delete
 * @returns {object} - A message string and the data object with the property to delete
 */
async function deleteConfig(data) {
  const propertyToDelete = data.delete;
  const response = await core.deleteConfig(propertyToDelete);
  const message = response ? `module 1 deleted the property ${propertyToDelete}` : `module 1 failed to delete the property ${data.delete}`;
  core.log(message, 'INFO');

  return {
    messages: message,
    data: data
  }
}

module.exports = {
  writeConfig,
  readConfig,
  deleteConfig,
};
