const { readFromMongo, writeToMongo, deleteFromMongo } = require('./mongo.js');

/**
 * Read Config
 * 
 * @param {object} data - The data to write to the config file
 */
async function readConfig(moduleName) {
  const data = await readFromMongo(moduleName);

  return data;
}

/**
 * Write Config
 * 
 * @param {object} data - The data to write to the config file
 */
async function writeConfig(moduleName, data) {
  try {
    const response = await writeToMongo(moduleName, data);
    return response;
  } catch (err) {
    console.error(`Error in writeConfig: ${err}`);
  }
}

/**
 * Delete Config
 * 
 * @param {string} property - The property to delete from the namespace
 */
async function deleteConfig(moduleName, property) {
  try {
    const response = await deleteFromMongo(moduleName, property);
    return response;
  } catch (err) {
    console.error(`Error in deleteConfig: ${err}`);
  }
}

module.exports = {
  readConfig,
  writeConfig,
  deleteConfig,
};