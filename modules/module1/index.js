const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const core = require('../../core/core.js');

/**
 * index
 * The main interface for the module.
 * 
 * @returns {string} - Compiled HTML content
 */
async function index() {
  const data = await core.readConfig();

  // Path to your Handlebars template file
  const templatePath = path.join(__dirname, 'index.hbs');
  
  // Read the template file
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  
  // Compile the template
  const template = Handlebars.compile(templateSource);

  // Generate the HTML by passing the data to the compiled template
  const html = template(data);

  // Return the HTML
  return html;
}

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

/**
 * longProcess
 * Start a long running process or report on the status of a long running process.
 * 
 * @param {object} data - An object with a delete property whose value is the property to delete
 * @returns {object} - A message string and the data object with the property to delete
 */
async function longProcess() {
  const configData = await core.readConfig();

  // Default to none if no processStatus is set
  const processStatus = configData.processStatus || 'none'

  let message;
  if (processStatus === 'none') {
    await core.writeConfig({ processStatus: 'running' });
    
    // Simulate a long running process
    setTimeout(async () => {
      await core.writeConfig({ processStatus: 'complete' });
    }, 15000);
    message = `A long running process has started`;
  } else if (processStatus === 'running') {
    message = `A long running process is running`;
  } else if (processStatus === 'complete') {
    await core.writeConfig({ processStatus: 'none' });
    message = `A long running process is complete`;
  }

  return {
    message,
  }
}

module.exports = {
  index,
  writeConfig,
  readConfig,
  deleteConfig,
  longProcess,
};
