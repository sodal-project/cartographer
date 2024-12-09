/**
 * @fileoverview Core system interface
 */

// Core Namespaces
// Accessed via core.<namespace>.<call>()
import cache from './cache.js'
import check from './check.js'
import client from './client.js'
import config from './config.js'
import crypto from './crypto.js'
import constants from './constants.js'
import graph from './graph.js'
import persona from './persona.js'
import server from './server.js'
import source from './source.js'
import types from './types.js'

// Core Imports
import { getCallingFolder } from './utilities.js';
import { consoleLog, writeLog } from './log.js';

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
 * @async
 * @param {Object[]} moduleArray - Array of module configuration objects
 * @param {string} moduleArray[].folder - Module folder name in modules directory
 * @param {string} moduleArray[].label - Display name for the module
 * @param {string} moduleArray[].category - Module category for organization
 * @param {string} moduleArray[].accessLevel - Required access level (operator|admin)
 * @returns {Promise<void>}
 * @throws {Error} If module initialization fails
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
    const moduleImport = await import(`../modules/${module}/mainPane.js`);
    calls.mod[module] = moduleImport.default;
    core.mod[module] = {};

    consoleLog(`Core: loading external module: ${module}`)

    // for each exported function in the module, add it to the core object
    for(const call in calls.mod[module]) {

      consoleLog(`Core: loading external module function: ${module}.${call}`)

      // if this is the default export, skip it
      if(call === 'default') { 
        consoleLog(`Core: skipping default export for module: ${module}`)
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

        } else {

          // if this is an object instead of a function, add it to core as is
          core.mod[module][call] = calls.mod[module][call];
        }
      }
    }
  }
  consoleLog(`Core: loaded ${counter} external module calls`)
}

/**
 * Wraps a function to include the calling module name as first parameter
 * @template T
 * @param {function(string, ...any): T} func - Function to wrap
 * @returns {function(...any): T} Wrapped function that includes calling module
 * @private
 */
const wrapWithModule = (func) => {
  return async (...params) => {
    const callingModule = getCallingFolder(new Error().stack);
    consoleLog(`Calling ${func.name} from ${callingModule}`);
    return await func(callingModule, ...params);
  }
}

/**
 * Wraps a function to log the calling module without passing it
 * @template T
 * @param {function(...any): T} func - Function to wrap
 * @returns {function(...any): T} Wrapped function that logs calling module
 * @private
 */
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
  await initModules(core.coreData.modules);

  // Group modules by category
  core.coreData.modulesByCategory = core.coreData.modules.reduce((acc, module) => {
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
 * Core system interface for Cartographer modules
 * @description The main interface for all Cartographer module interactions. Provides:
 * - Module management and initialization
 * - Graph database operations
 * - Cache management
 * - Configuration management
 * - Type checking and validation
 * - Client-side rendering
 * - Logging
 * - Encryption services
 */
const core = {

  /**
   * System configuration and module data
   * @type {Object}
   * @property {string} currentModule - Currently executing module name
   * @property {Object[]} modules - Available system modules
   * @property {string} modules[].folder - Module folder name
   * @property {string} modules[].label - Module display name
   * @property {string} modules[].category - Module category
   * @property {string} modules[].accessLevel - Required access level
   * @property {Object.<string, Object[]>} modulesByCategory - Modules grouped by category
   */
  coreData: {
    currentModule: 'none',
    modules: [
      // {
      //   folder: "directory",
      //   label: "Directory",
      //   category: "Discovery",
      //   accessLevel: "operator"
      // },
      // {
      //   folder: "filter-queries",
      //   label: "Filter Queries",
      //   category: "Discovery",
      //   accessLevel: "operator"
      // },
      // {
      //   folder: "detailPane",
      //   label: "Detail Pane",
      //   category: "Discovery",
      //   accessLevel: "operator"
      // },
      // {
      //   folder: "slack",
      //   label: "Slack Integration",
      //   category: "Integrations",
      //   accessLevel: "admin"
      // },
      // {
      //   folder: "google",
      //   label: "Google Integration",
      //   category: "Integrations",
      //   accessLevel: "admin"
      // },
      // {
      //   folder: "tableau",
      //   label: "Tableau Integration",
      //   category: "Integrations",
      //   accessLevel: "admin"
      // },
      // {
      //   folder: "bamboohr",
      //   label: "BambooHR Integration",
      //   category: "Integrations",
      //   accessLevel: "admin"
      // },
      // {
      //   folder: "powerbi",
      //   label: "PowerBI Integration",
      //   category: "Integrations",
      //   accessLevel: "admin"
      // },
      // {
      //   folder: "personaTable",
      //   label: "Persona Table",
      //   category: "System",
      //   accessLevel: "admin"
      // },
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
      // {
      //   folder: "exportCsv",
      //   label: "Export CSV",
      //   category: "System",
      //   accessLevel: "admin"
      // },
    ]
  },

  /**
   * Initialize the core system
   * @async
   * @returns {Promise<Core>} Initialized and frozen core object
   */
  init,

  /**
   * System logging function
   * @param {string} message - Message to log
   * @param {string} [type='UNKNOWN_TYPE'] - Log message type
   * @returns {void}
   */
  log,

  /**
   * Cache management functions
   * @namespace Core.cache
   */
  cache: {
    /**
     * Save data to cache
     * @async
     * @param {string} key - Cache key
     * @param {any} value - Data to cache
     * @returns {Promise<void>}
     */
    save: wrapWithModule(cache.save),

    /**
     * Load data from cache
     * @async
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached data
     */
    load: wrapWithModule(cache.load)
  },

  /**
   * Type checking and validation functions
   * @namespace Core.check
   */
  check: {
    /**
     * Check if a value is a confidence number
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    confidenceNumber: wrapWithoutModule(check.confidenceNumber),

    /**
     * Check if a value is an ID string
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    idString: wrapWithoutModule(check.idString),

    /**
     * Check if a value is a level number
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    levelNumber: wrapWithoutModule(check.levelNumber),

    /**
     * Check if a value is a persona object
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    personaObject: wrapWithoutModule(check.personaObject),

    /**
     * Check if a value is a persona relationships array
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    personaRelsArray: wrapWithoutModule(check.personaRelsArray),

    /**
     * Check if a value is a platform string
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    platformString: wrapWithoutModule(check.platformString),

    /**
     * Check if a value is a relationship object
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    relationshipObject: wrapWithoutModule(check.relationshipObject),

    /**
     * Check if a value is an SID string
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    sidString: wrapWithoutModule(check.sidString),

    /**
     * Check if a value is a simple value
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    simpleValue: wrapWithoutModule(check.simpleValue),

    /**
     * Check if a value is a source object
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    sourceObject: wrapWithoutModule(check.sourceObject),

    /**
     * Check if a value is a source store modified persona object
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    sourceStoreModifiedPersonaObject: wrapWithoutModule(check.sourceStoreModifiedPersonaObject),

    /**
     * Check if a value is a source store modified persona relationships object
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    sourceStoreModifiedPersonaRelationshipsObject: wrapWithoutModule(check.sourceStoreModifiedPersonaRelationshipsObject),

    /**
     * Check if a value is a source store object
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    sourceStoreObject: wrapWithoutModule(check.sourceStoreObject),

    /**
     * Check if a value is a type string
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    typeString: wrapWithoutModule(check.typeString),

    /**
     * Check if a value is an UPN string
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    upnString: wrapWithoutModule(check.upnString)
  },

  /**
   * Client-side rendering functions
   * @namespace Core.client
   */
  client: {
    /**
     * Render a handlebars template
     * @param {string} template - Template name
     * @param {object} data - Data to pass to the template
     * @returns {string} Rendered HTML
     */
    render: wrapWithModule(client.render),

    /**
     * Register handlebars partials
     * @returns {void}
     */
    registerPartials: wrapWithModule(client.registerPartials)
  },

  /**
   * Configuration management functions
   * @namespace Core.config
   */
  config: {
    /**
     * Read configuration data
     * @async
     * @param {string} key - Configuration key
     * @returns {Promise<any>} Configuration data
     */
    readConfig: wrapWithModule(config.readConfig),

    /**
     * Write configuration data
     * @async
     * @param {string} key - Configuration key
     * @param {any} value - Configuration data
     * @returns {Promise<void>}
     */
    writeConfig: wrapWithModule(config.writeConfig),

    /**
     * Delete configuration data
     * @async
     * @param {string} key - Configuration key
     * @returns {Promise<void>}
     */
    deleteConfig: wrapWithModule(config.deleteConfig)
  },

  // Constants namespace (direct assignment)
  constants: constants,

  /**
   * Encryption and decryption functions
   * @namespace Core.crypto
   */
  crypto: {
    /**
     * Encrypt data
     * @async
     * @param {string} data - Data to encrypt
     * @returns {Promise<string>} Encrypted data
     */
    encrypt: wrapWithModule(crypto.encrypt),

    /**
     * Decrypt data
     * @async
     * @param {string} data - Data to decrypt
     * @returns {Promise<string>} Decrypted data
     */
    decrypt: wrapWithModule(crypto.decrypt)
  },

  /**
   * Graph database functions
   */
  graph: {
    /**
     * Backup a source
     * @async
     * @param {SourceObject.id} sourceId - Source ID
     * @returns {Promise<void>}
     */
    backupSource: wrapWithModule(graph.backupSource),

    /**
     * Delete orphaned personas
     * @async
     * @returns {Promise<void>}
     */
    deleteOrphanedPersonas: wrapWithModule(graph.deleteOrphanedPersonas),

    /**
     * Delete a persona
     * @async
     * @param {string} upn - Persona UPN
     * @returns {Promise<void>}
     */
    deletePersona: wrapWithModule(graph.deletePersona),

    /**
     * Delete a source
     * @async
     * @param {string} sourceId - Source ID
     * @returns {Promise<void>}
     */
    deleteSource: wrapWithModule(graph.deleteSource),

    /**
     * Merge a persona with the graph database
     * @async
     * @param {PersonaObject} persona - Persona object to merge
     * @param {SourceObject} [source] - Optional source object
     * @param {boolean} [querySetOnly=false] - Return query set instead of executing
     * @returns {Promise<GraphResponse|QuerySet>} Graph response or query set
     * @throws {Error} If persona object is invalid
     */
    mergePersona: wrapWithModule(graph.mergePersona),

    /**
     * Merge personas
     * @async
     * @returns {Promise<void>}
     */
    mergePersonas: wrapWithModule(graph.mergePersonas),

    /**
     * Merge a source
     * @async
     * @param {string} sourceId - Source ID
     * @returns {Promise<void>}
     */
    mergeSource: wrapWithModule(graph.mergeSource),

    /**
     * Read orphaned personas
     * @async
     * @returns {Promise<void>}
     */ 
    readOrphanedPersonas: wrapWithModule(graph.readOrphanedPersonas),

    /**
     * Read personas
     * @async
     * @param {Core.Filter} [filter] - Optional filter criteria
     * @param {Object} [params] - Sort and pagination parameters
     * @param {string} [params.field] - Field to sort by
     * @param {string} [params.direction] - Sort direction ("ASC" or "DESC")
     * @param {number} [params.pageNum] - Page number
     * @param {number} [params.pageSize] - Page size
     * @returns {Promise<GraphResponse>} Graph query response
     * @throws {Error} If filter parameters are invalid
     */
    readPersona: wrapWithModule(graph.readPersona),

    /**
     * Read personas
     * @async
     * @returns {Promise<void>}
     */
    readPersonas: wrapWithModule(graph.readPersonas),

    /**
     * Read a source
     * @async
     * @param {string} sourceId - Source ID
     * @returns {Promise<void>}
     */
    readSource: wrapWithModule(graph.readSource),

    /**
     * Read source personas
     * @async
     * @param {string} sourceId - Source ID
     * @returns {Promise<void>}
     */
    readSourcePersonas: wrapWithModule(graph.readSourcePersonas),

    /**
     * Read source relationships
     * @async
     * @param {string} sourceId - Source ID
     * @returns {Promise<void>}
     */
    readSourceRelationships: wrapWithModule(graph.readSourceRelationships),

    /**
     * Remove a persona
     * @async
     * @param {string} upn - Persona UPN
     * @returns {Promise<void>}
     */
    removePersona: wrapWithModule(graph.removePersona),

    /**
     * Restore a source
     * @async
     * @param {string} sourceId - Source ID
     * @returns {Promise<void>}
     */
    restoreSource: wrapWithModule(graph.restoreSource),

    /**
     * Run a raw query
     * @async
     * @param {string} query - Query to run
     * @returns {Promise<void>}
     */
    runRawQuery: wrapWithModule(graph.runRawQuery),

    /**
     * Run a raw query and return an array
     * @async
     * @param {string} query - Query to run
     * @returns {Promise<void>}
     */
    runRawQueryArray: wrapWithModule(graph.runRawQueryArray),

    /**
     * Sync personas
     * @async
     * @returns {Promise<void>}
     */
    syncPersonas: wrapWithModule(graph.syncPersonas),

    /**
     * Unlink personas
     * @async
     * @returns {Promise<void>}
     */
    unlinkPersonas: wrapWithModule(graph.unlinkPersonas)
  },

  // Persona namespace
  persona: {
    generateUpnRaw: wrapWithoutModule(persona.generateUpnRaw),
    getFromRelationships: wrapWithoutModule(persona.getFromRelationships),
    getProps: wrapWithoutModule(persona.getProps),
    newFromUpn: wrapWithoutModule(persona.newFromUpn)
  },

  /**
   * Server-side functions
   */
  server: {
    realtime: server.realtime,
    CoreServerModule: server.CoreServerModule
  },

  // Source namespace
  source: {
    getSourceObject: wrapWithModule(source.getSourceObject)
  }
};

export default core;