const { readFromMongo, writeToMongo, deleteFromMongo } = require('./mongo.js');

/**
 * Read Persistent Module Configuration Data 
 * 
 * @param {string} moduleName - The name of the module associated with the configuration data
 * @param {string} optionalKey - The optional key to read from the configuration data
 * @returns {object} - The configuration data
 */
async function readConfig(moduleName, optionalKey) {
  const data = await readFromMongo(moduleName);

  if(optionalKey && data) {
    return data[optionalKey];
  }

  return data;
}

/**
 * Write Persistent Module Configuration Data
 * 
 * @param {string} moduleName - The name of the module associated with the configuration data
 * @param {object} data - The data to write to the config file
 * @returns {object|boolean} - The response from the database, or false if an error occurred
 */
async function writeConfig(moduleName, data) {
  try {
    const response = await writeToMongo(moduleName, data);
    return response;
  } catch (err) {
    console.error(`Error in writeConfig: ${err}`);
    return false;
  }
}

/**
 * Delete Persistent Module Configuration Data
 * 
 * @param {string} moduleName - The name of the module associated with the configuration data
 * @param {string} property - The property to delete from the namespace
 * @returns {object|boolean} - The response from the database, or false if an error occurred
 */
async function deleteConfig(moduleName, property) {
  try {
    const response = await deleteFromMongo(moduleName, property);
    return response;
  } catch (err) {
    console.error(`Error in deleteConfig: ${err}`);
    return false;
  }
}

module.exports = {
  readConfig,
  writeConfig,
  deleteConfig,
};