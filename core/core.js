const Handlebars = require('handlebars');
const fs = require('fs');

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

/**
 * Render Handlebars Template
 * 
 * @param {string} templateName - The name of the modules Handlebars template file
 * @param {object} data - The data to pass to the Handlebars template
 */
function render(templateName, data) {
  const moduleName = getCallingFolder(new Error().stack);
  
  // Path to the Handlebars template file
  const templatePath = `/app/modules/${moduleName}/${templateName}`;
  
  // Read the template file
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  
  // Compile the template
  const template = Handlebars.compile(templateSource);

  // Generate the HTML by passing the data to the compiled template
  const html = template(data);

  // Return the HTML
  return html;
}

module.exports = {
  log,
  readConfig,
  writeConfig,
  deleteConfig,
  render,
};
