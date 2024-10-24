const path = require('path');
const Handlebars = require('handlebars');
const fs = require('fs');

// Core Imports
const { getCallingFolder } = require('./utilities.js');
const { readFromMongo, writeToMongo, deleteFromMongo } = require('./mongo.js');
const { writeLog } = require('./log.js');

// Core Namespaced Calls
const namespaces = {
  cache: require('./cache.js'),
  check: require('./check.js'),
  constants: require('./constants.js'),
  graph: require('./graph.js'),
  persona: require('./persona.js'),
  sourceStore: require('./sourceStore.js'),
};

// Core External Module Calls
// In future, this will be moved to the configuration database
const externalModules = {
  module1: () => require('../modules/module1/index.js'),
  module2: () => require('../modules/module2/index.js'),
  "long-process": () => require('../modules/long-process/index.js'),
  "slack": () => require('../modules/slack/index.js'),
  // csv: () => require('../modules/csv/index.js'),
}
// Core Data - this will live in the config database eventually
const coreData = {
  user: {
    name: "Dade Murphy",
  },
  main: '',
  currentModule: 'none',
  modules: [
    {
      folder: "module1",
      label: "Module 1",
    },
    {
      folder: "module2",
      label: "Module 2",
    },
    {
      folder: "long-process",
      label: "Long Process",
    },
    {
      folder: "slack",
      label: "Slack Integration",
    },
  ]
}

// A private object to store the raw calls made through core
const calls = {};

//
// Private Functions
//

/**
 * Initialize Core Namespaces
 */
function initNamespaces() {

  for(const module in namespaces) {
    calls[module] = namespaces[module]
    core[module] = {};

    console.log("Core: loading internal module: ", module)

    for(const call in calls[module]) {
      if(call === 'default') { continue; }

      if(typeof calls[module][call] === 'function') {
        console.log(`Core: adding function: core.${module}.${call}`)
        core[module][call] = (...params) => {

          console.log(`Core: calling function: ${call} from ${module}`)
          
          return calls[module][call](...params);
        }
      } else {
        console.log(`Core: adding object: core.${module}.${call}`)
        core[module][call] = calls[module][call];
      }
    }
  }
}

/**
 * Initialize External Modules
 */
async function initModules() {
  // 
  // load external module calls to core.mod
  // 
  for(const module in externalModules) {
    calls[module] = await externalModules[module]()
    core.mod[module] = {};

    console.log("Core: loading external module: ", module)

    for(const call in calls[module]) {
      if(call === 'default') { 
        continue; 
      } else if(call === 'init') {
        await calls[module][call]();
        continue;
      } else {
        if(typeof calls[module][call] === 'function') {
          console.log(`Core: adding function: core.mod.${module}.${call}`)
          core.mod[module][call] = (...params) => {
            console.log(`Core: calling function: ${call} from ${module}`)
            return calls[module][call](...params);
          }
        } else {
          console.log(`Core: adding object: core.mod.${module}.${call}`)
          core.mod[module][call] = calls[module][call];
        }
      }
    }
  }
}

//
// Core Public Functions
//

/**
 * Initialize Core
 * 
 * @returns {object} - The core object
 */
async function init() {
  if(core.ready) { 
    return core; 
  }

  // Initialize core's namespaced internal calls
  initNamespaces();

  // Initialize core's external module calls
  await initModules();

  //
  // finalize core and freeze
  //
  core.ready = true;
  Object.freeze(core);
  console.log(`Core frozen status: ${Object.isFrozen(core)}`)
  console.log("Core: initialized")
  return core;
}

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

// Core object to export
const core = {
  ready: false,
  mod: {},
  coreData,
  log,
  render,
  readConfig,
  writeConfig,
  deleteConfig,
  init,
};

module.exports = core;