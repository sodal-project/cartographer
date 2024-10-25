const Handlebars = require('handlebars');
const fs = require('fs');

// Core Imports
const { getCallingFolder } = require('./utilities.js');
const { writeLog } = require('./log.js');

// Core Namespaced Calls
const namespaces = {
  cache: require('./cache.js'),
  check: require('./check.js'),
  config: require('./config.js'),
  constants: require('./constants.js'),
  graph: require('./graph.js'),
  persona: require('./persona.js'),
  sourceStore: require('./sourceStore.js'),
};

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
    {
      folder: "csv",
      label: "CSV Integration",
    }
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

  for(const namespace in namespaces) {
    calls[namespace] = namespaces[namespace]
    core[namespace] = {};

    console.log("Core: loading internal module: ", namespace)

    for(const call in calls[namespace]) {
      if(call === 'default') { continue; }

      if(typeof calls[namespace][call] === 'function') {
        console.log(`Core: adding function: core.${namespace}.${call}`)
        core[namespace][call] = (...params) => {
          const callingModule = getCallingFolder(new Error().stack)
          console.log(`Calling core.${namespace}.${call} from ${callingModule}`)

          if(namespace === 'cache' || namespace === 'config') {
            return calls[namespace][call](callingModule, ...params);
          } else {
            return calls[namespace][call](...params);
          }
        }
      } else {
        console.log(`Core: adding object: core.${namespace}.${call}`)
        core[namespace][call] = calls[namespace][call];
      }
    }
  }
}

/**
 * Initialize External Modules
 */
async function initModules(moduleArray) {

  // Generate Core External Module Calls
  // In future, this will be moved to the configuration database

  // load external module calls to core.mod
  for(const item in moduleArray) {
    const module = moduleArray[item].folder;
    calls[module] = await require(`../modules/${module}/index.js`);
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
            const callingModule = getCallingFolder(new Error().stack);
            console.log(`Calling core.mod.${module}.${call} from ${callingModule}`)
            return calls[module][call](...params);
          }
          Object.defineProperty(core.mod[module][call], 'name', { value: `core.mod.${module}.${call}` });
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
  await initModules(coreData.modules);

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
  init,
};

module.exports = core;