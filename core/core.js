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
const { consoleLog, writeLog } = require('./log.js');

// Core Data
// TODO: move this to config database
const coreData = {
  currentModule: 'none',
  modules: [
    {
      folder: "directory",
      label: "Directory",
      category: "Discovery",
      accessLevel: "operator"
    },
    {
      folder: "filter-queries",
      label: "Filter Queries",
      category: "Discovery",
      accessLevel: "operator"
    },
    {
      folder: "detailPane",
      label: "Detail Pane",
      category: "Discovery",
      accessLevel: "operator"
    },
    {
      folder: "slack",
      label: "Slack Integration",
      category: "Integrations",
      accessLevel: "admin"
    },
    {
      folder: "google",
      label: "Google Integration",
      category: "Integrations",
      accessLevel: "admin"
    },
    {
      folder: "tableau",
      label: "Tableau Integration",
      category: "Integrations",
      accessLevel: "admin"
    },
    {
      folder: "bamboohr",
      label: "BambooHR Integration",
      category: "Integrations",
      accessLevel: "admin"
    },
    {
      folder: "powerbi",
      label: "PowerBI Integration",
      category: "Integrations",
      accessLevel: "admin"
    },
    {
      folder: "personaTable",
      label: "Persona Table",
      category: "System",
      accessLevel: "admin"
    },
    {
      folder: "test-config",
      label: "Test Config",
      category: "System",
      accessLevel: "admin"
    },
    {
      folder: "test-long-process",
      label: "Test Long Process",
      category: "System",
      accessLevel: "admin"
    },
    {
      folder: "exportCsv",
      label: "Export CSV",
      category: "System",
      accessLevel: "admin"
    },
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
 * Initialize External Modules
 * This function initializes external modules and adds them to the core object
 * 
 * @param {array} moduleArray - An array of objects containing the module folder name and label
 */
async function initModules(moduleArray) {
  let counter = 0;

  // Generate Core External Module Calls
  core.mod = {};
  calls.mod = {};

  // load external module calls to core.mod.<module>.<call>
  for(const item in moduleArray) {
    const module = moduleArray[item].folder;

    // load the module
    calls.mod[module] = await require(`../modules/${module}/mainPane.js`);
    core.mod[module] = {};

    consoleLog(`Core: loading external module: ${module}`)

    // for each exported function in the module, add it to the core object
    for(const call in calls.mod[module]) {

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
        await calls.mod[module][call]();
        continue;
      } 
      
      else {
        counter++;
        // if this is a function, add it to the core object
        if(typeof calls.mod[module][call] === 'function') {

          // add the function to the core object
          core.mod[module][call] = (...params) => {
            const callingModule = getCallingFolder(new Error().stack);
            consoleLog(`Calling core.mod.${module}.${call} from ${callingModule}`)
            return calls.mod[module][call](...params);
          }

          // set the function name to the full path to improve error reporting
          Object.defineProperty(core.mod[module][call], 'name', { value: `core.mod.${module}.${call}` });

        } else {

          // if this is an object instead of a function, add it to core as is
          core.mod[module][call] = calls.mod[module][call];
        }
      }
    }
  }
  consoleLog(`Core: loaded ${counter} external module calls`)
}

const wrapWithModule = (func) => {
  return async (...params) => {
    const callingModule = getCallingFolder(new Error().stack);
    consoleLog(`Calling ${func.name} from ${callingModule}`);
    return await func(callingModule, ...params);
  }
}

const wrapWithoutModule = (func) => {
  return async (...params) => {
    const callingModule = getCallingFolder(new Error().stack);
    consoleLog(`Calling ${func.name} from ${callingModule}`);
    return await func(...params);
  }
}

// Initialize core and freeze it
async function init() {
  consoleLog("Core: initializing")
  if(core.ready) {
    consoleLog("Core: already initialized")
    return core;
  }

  client.registerPartials();

  // Initialize core's external module calls
  await initModules(coreData.modules);

  // Group modules by category
  coreData.modulesByCategory = coreData.modules.reduce((acc, module) => {
    const category = module.category || '';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {});

  // finalize core and freeze it
  core.ready = true;
  Object.freeze(core);
  consoleLog("Core: initialized")
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

  // Cache namespace
  cache: {
    save: wrapWithModule(cache.save),
    load: wrapWithModule(cache.load)
  },

  // Check namespace
  check: {
    confidenceNumber: wrapWithoutModule(check.confidenceNumber),
    idString: wrapWithoutModule(check.idString),
    levelNumber: wrapWithoutModule(check.levelNumber),
    personaObject: wrapWithoutModule(check.personaObject),
    personaRelsArray: wrapWithoutModule(check.personaRelsArray),
    platformString: wrapWithoutModule(check.platformString),
    relationshipObject: wrapWithoutModule(check.relationshipObject),
    sidString: wrapWithoutModule(check.sidString),
    simpleValue: wrapWithoutModule(check.simpleValue),
    sourceObject: wrapWithoutModule(check.sourceObject),
    sourceStoreModifiedPersonaObject: wrapWithoutModule(check.sourceStoreModifiedPersonaObject),
    sourceStoreModifiedPersonaRelationshipsObject: wrapWithoutModule(check.sourceStoreModifiedPersonaRelationshipsObject),
    sourceStoreObject: wrapWithoutModule(check.sourceStoreObject),
    typeString: wrapWithoutModule(check.typeString),
    upnString: wrapWithoutModule(check.upnString)
  },

  // Client namespace
  client: {
    render: wrapWithModule(client.render),
    registerPartials: wrapWithModule(client.registerPartials)
  },

  // Config namespace
  config: {
    readConfig: wrapWithModule(config.readConfig),
    writeConfig: wrapWithModule(config.writeConfig),
    deleteConfig: wrapWithModule(config.deleteConfig)
  },

  // Constants namespace (direct assignment)
  constants: constants,

  // Crypto namespace
  crypto: {
    encrypt: wrapWithModule(crypto.encrypt),
    decrypt: wrapWithModule(crypto.decrypt)
  },

  // Graph namespace
  graph: {
    backupSource: wrapWithModule(graph.backupSource),
    deleteOrphanedPersonas: wrapWithModule(graph.deleteOrphanedPersonas),
    deletePersona: wrapWithModule(graph.deletePersona),
    deleteSource: wrapWithModule(graph.deleteSource),
    mergePersona: wrapWithModule(graph.mergePersona),
    mergePersonas: wrapWithModule(graph.mergePersonas),
    mergeSource: wrapWithModule(graph.mergeSource),
    readOrphanedPersonas: wrapWithModule(graph.readOrphanedPersonas),
    readPersona: wrapWithModule(graph.readPersona),
    readPersonas: wrapWithModule(graph.readPersonas),
    readSource: wrapWithModule(graph.readSource),
    readSourcePersonas: wrapWithModule(graph.readSourcePersonas),
    readSourceRelationships: wrapWithModule(graph.readSourceRelationships),
    removePersona: wrapWithModule(graph.removePersona),
    restoreSource: wrapWithModule(graph.restoreSource),
    runRawQuery: wrapWithModule(graph.runRawQuery),
    runRawQueryArray: wrapWithModule(graph.runRawQueryArray),
    syncPersonas: wrapWithModule(graph.syncPersonas),
    unlinkPersonas: wrapWithModule(graph.unlinkPersonas)
  },

  // Persona namespace
  persona: {
    generateUpnRaw: wrapWithoutModule(persona.generateUpnRaw),
    getFromRelationships: wrapWithoutModule(persona.getFromRelationships),
    getProps: wrapWithoutModule(persona.getProps),
    newFromUpn: wrapWithoutModule(persona.newFromUpn)
  },

  // Source namespace
  source: {
    getSourceObject: wrapWithModule(source.getSourceObject)
  }
};

module.exports = core;