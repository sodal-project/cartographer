// Core Imports
const { getCallingFolder } = require('./utilities.js');
const { readFromMongo, writeToMongo, deleteFromMongo } = require('./mongo.js');
const { writeLog } = require('./log.js');


/**
 * Log
 * Log a message to a file
 * 
 * @param {string} message - The message to log
 * @param {string} type - The type of message to log
 */
function log(message, type='UNKNOWN_TYPE') {
  const moduleName = getCallingFolder(new Error().stack);

  writeLog(moduleName, message, type);
}

/**
 * Read Config
 * 
 * @param {object} data - The data to write to the config file
 */
async function readConfig() {
  const moduleName = getCallingFolder(new Error().stack);
  const data = await readFromMongo(moduleName);

  return data;
}

/**
 * Write Config
 * 
 * @param {object} data - The data to write to the config file
 */
async function writeConfig(data) {
  const moduleName = getCallingFolder(new Error().stack);

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
async function deleteConfig(property) {
  const moduleName = getCallingFolder(new Error().stack);

  try {
    const response = await deleteFromMongo(moduleName, property);
    return response;
  } catch (err) {
    console.error(`Error in deleteConfig: ${err}`);
  }
}

module.exports = {
  log,
  readConfig,
  writeConfig,
  deleteConfig,
};
