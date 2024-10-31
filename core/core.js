// Core Namespaces
// Accessed via core.<namespace>.<call>()
const cache = require('./cache.js')
const check = require('./check.js')
const client = require('./client.js')
const config = require('./config.js')
const crypto = require('./crypto.js')
const constants = require('./constants.js')
const graph = require('./graph.js')
const persona = require('./persona.js')
const source = require('./source.js')

const namespaces = {
  cache,
  check,
  client,
  config,
  constants,
  crypto,
  graph,
  persona,
  source,
};

// Core Imports
const { getCallingFolder } = require('./utilities.js');
const { writeLog } = require('./log.js');

// Core Data
// TODO: move this to config database
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

/**
 * This object stores the raw calls made through core
 * 
 * Together with the core namespace calls, this enables core to:
 * 1 - capture the call
 * 2 - identify the calling module
 * 3 - log the call
 * 4 - pass additional context to the root call if necessary
 */ 
const calls = {};

/**
 * Initialize Core Namespaces
 * This function initializes the core namespaces and adds them to the core object
 * 
 * NOTE - this is a temporary solution to speed development; future versions will use traditional functions
 * 
 * Core namepaces use the form: core.namespace.function() 
 */
function initNamespaces() {
  let counter = 0;

  // Map exported calls from each namespace to core
  for(const namespace in namespaces) {
    calls[namespace] = namespaces[namespace]
    core[namespace] = {};

    console.log("Core: loading internal module: ", namespace)

    // For each exported function in the namespace, add it to the core object
    for(const call in calls[namespace]) {

      // skip the default export
      if(call === 'default') { continue; }

      counter++;

      // if this is a function, add it to the core object
      if(typeof calls[namespace][call] === 'function') {
        console.log(`Core: adding function: core.${namespace}.${call}`)
        core[namespace][call] = (...params) => {

          // get the calling module name
          const callingModule = getCallingFolder(new Error().stack)
          console.log(`Calling core.${namespace}.${call} from ${callingModule}`)

          /**
           * Some calls need to know the calling module, in which case we pass
           * the calling module name as the first parameter
           * 
           * Currently required for:
           * - cache: module name is used to prevent modules from overwriting each other's cache
           * - config: module name is used to prevent modules from overwriting each other's config
           * - client: module name is used to reference the correct location for the Handlebars template
           */ 
          if(namespace === 'cache' ||
             namespace === 'config' ||
             namespace === 'client' ||
             namespace === 'source' ||
             namespace === 'graph' ||
             namespace === 'crypto') {
            return calls[namespace][call](callingModule, ...params);
          } else {
            return calls[namespace][call](...params);
          }
        }
      } else {

        // if this is an object instead of a function, add it to core as is
        console.log(`Core: adding object: core.${namespace}.${call}`)
        core[namespace][call] = calls[namespace][call];
      }
    }
  }

  console.log(`Core: loaded ${counter} internal namespace calls`)
}

/**
 * Initialize External Modules
 * This function initializes external modules and adds them to the core object
 * 
 * @param {array} moduleArray - An array of objects containing the module folder name and label
 */
async function initModules(moduleArray) {
  let counter = 0;

  // Generate Core External Module Calls
  core.mod = {};

  // load external module calls to core.mod.<module>.<call>
  for(const item in moduleArray) {
    const module = moduleArray[item].folder;

    // load the module
    calls[module] = await require(`../modules/${module}/index.js`);
    core.mod[module] = {};

    console.log("Core: loading external module: ", module)

    // for each exported function in the module, add it to the core object
    for(const call in calls[module]) {

      // if this is the default export, skip it
      if(call === 'default') { 
        continue; 
      }
      
      /**
       * if this is the module's init function, call it immediately
       * 
       * The init function gives each module a chance to 
       * setup itself prior to being called by other modules
       */
      else if(call === 'init') {
        await calls[module][call]();
        continue;
      } 
      
      else {
        counter++;
        // if this is a function, add it to the core object
        if(typeof calls[module][call] === 'function') {

          // add the function to the core object
          console.log(`Core: adding function: core.mod.${module}.${call}`)
          core.mod[module][call] = (...params) => {
            const callingModule = getCallingFolder(new Error().stack);
            console.log(`Calling core.mod.${module}.${call} from ${callingModule}`)
            return calls[module][call](...params);
          }

          // set the function name to the full path to improve error reporting
          Object.defineProperty(core.mod[module][call], 'name', { value: `core.mod.${module}.${call}` });

        } else {

          // if this is an object instead of a function, add it to core as is
          console.log(`Core: adding object: core.mod.${module}.${call}`)
          core.mod[module][call] = calls[module][call];
        }
      }
    }
  }
  console.log(`Core: loaded ${counter} external module calls`)
}

/**
 * Initialize Core
 * 
 * Before core can be used, it must be initialized
 * 
 * This function initializes the core object by:
 * - initializing core namespaces
 * - initializing external modules
 * - finalizing core and freezing it
 * 
 * @returns {object} - The initialized core object
 */
async function init() {
  console.log("Core: initializing")
  if(core.ready) {
    console.log("Core: already initialized")
    return core;
  }

  // Initialize core's namespaced internal calls
  initNamespaces();

  // Initialize core's external module calls
  await initModules(coreData.modules);

  // finalize core and freeze it
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
 * Core object to export
 * 
 * This object is the main interface for all modules across Cartographer
 * 
 * This object includes:
 * -- initiation function & ready state
 * -- core data (this will be replaced by the configuration database)
 * -- logging function
 * -- core namespace calls (assigned to core.<namespace>.<function>)
 * -- external module calls (assigned to core.mod.<module>.<function>)
 */
const core = {
  coreData,
  init,
  log,
};

module.exports = core;