/**
 * @fileoverview Core system interface
 */

// Core Namespaces
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
      {
        folder: "test-ping",
        label: "Test Ping",
        category: "System",
        accessLevel: "admin"
      },
      {
        folder: "test-submodule",
        label: "Test Submodule",
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

};

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
    const moduleImport = await import(`../modules/${module}/server.js`);
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
            consoleLog(`Calling core.mod.${module}.${call} from an API call`)
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

export class CoreModule {
  constructor(name) {
    // Validate that name matches a valid module folder
    const validModules = core.coreData.modules.map(m => m.folder);
    if (!validModules.includes(name)) {
      throw new Error(`Invalid module name "${name}". Must match one of the registered module folders: ${validModules.join(', ')}`);
    }
    
    try {
      // Validate that this is being called from the correct module folder
      if(getCallingFolder(new Error().stack) !== name) {
        throw new Error(`Module "${name}" must be initialized from its own directory`)  ;
      }
    } catch (err) {
      throw new Error(`Module "${name}" must be initialized from its own directory`);
    }
    
    this.name = name;
    
    this.core = {
      cache: {
        save: async (...args) => await cache.save(this.name, ...args),
        load: async (...args) => await cache.load(this.name, ...args)
      },
      config: {
        readConfig: async (...args) => await config.readConfig(this.name, ...args),
        writeConfig: async (...args) => await config.writeConfig(this.name, ...args),
        deleteConfig: async (...args) => await config.deleteConfig(this.name, ...args)
      },
      graph: {
        mergePersona: async (...args) => await graph.mergePersona(this.name, ...args),
        readPersona: async (...args) => await graph.readPersona(this.name, ...args),
        backupSource: async (...args) => await graph.backupSource(this.name, ...args),
        deleteOrphanedPersonas: async (...args) => await graph.deleteOrphanedPersonas(this.name, ...args),
        deletePersona: async (...args) => await graph.deletePersona(this.name, ...args),
        deleteSource: async (...args) => await graph.deleteSource(this.name, ...args),
        mergePersonas: async (...args) => await graph.mergePersonas(this.name, ...args),
        mergeSource: async (...args) => await graph.mergeSource(this.name, ...args),
        readOrphanedPersonas: async (...args) => await graph.readOrphanedPersonas(this.name, ...args),
        readPersonas: async (...args) => await graph.readPersonas(this.name, ...args),
        readSource: async (...args) => await graph.readSource(this.name, ...args),
        readSourcePersonas: async (...args) => await graph.readSourcePersonas(this.name, ...args),
        readSourceRelationships: async (...args) => await graph.readSourceRelationships(this.name, ...args),
        removePersona: async (...args) => await graph.removePersona(this.name, ...args),
        restoreSource: async (...args) => await graph.restoreSource(this.name, ...args),
        runRawQuery: async (...args) => await graph.runRawQuery(this.name, ...args),
        runRawQueryArray: async (...args) => await graph.runRawQueryArray(this.name, ...args),
        syncPersonas: async (...args) => await graph.syncPersonas(this.name, ...args),
        unlinkPersonas: async (...args) => await graph.unlinkPersonas(this.name, ...args)
      },

      // Direct pass-through for utility functions that don't need module context
      check: check,
      constants: constants,
      types: types,

      // Mixed namespace - some methods need context, others don't
      client: {
        render: async (...args) => await client.render(this.name, ...args),
        registerPartials: client.registerPartials // Direct pass-through
      },

      crypto: {
        encrypt: async (...args) => await crypto.encrypt(this.name, ...args),
        decrypt: async (...args) => await crypto.decrypt(this.name, ...args)
      },

      source: {
        getSourceObject: async (...args) => await source.getSourceObject(this.name, ...args)
      },

      persona: {
        generateUpnRaw: persona.generateUpnRaw,
        getFromRelationships: persona.getFromRelationships,
        getProps: persona.getProps,
        newFromUpn: persona.newFromUpn
      },

      server: {
        realtime: server.realtime
      },

      log: (message, type = 'UNKNOWN_TYPE') => writeLog(this.name, message, type),

      // Add mod namespace for accessing other modules
      mod: {},
    };

    // Populate mod namespace
    for (const [moduleName, moduleFunctions] of Object.entries(core.mod)) {
      this.core.mod[moduleName] = {};
      
      for (const [funcName, func] of Object.entries(moduleFunctions)) {
        if (typeof func === 'function') {
          this.core.mod[moduleName][funcName] = async (...args) => {
            consoleLog(`${this.name} calling core.mod.${moduleName}.${funcName} from ${moduleName}`);
            return await func(...args);
          };
        } else {
          this.core.mod[moduleName][funcName] = func;
        }
      }
    }
  }

  // Template helper that modules can use
  async renderComponent(name, props = {}, options = {}) {
    const { id } = props;
    
    return `
      <div id="component-mount-${id}">
        <script type="module">
          // Load and define the module first
          const { CoreClientModule } = window;
          await import('/public/${this.name}/client.js');
          
          // Then create the component once module is loaded
          const component = document.createElement('${name}');
          component.id = '${id}';
          document.getElementById('component-mount-${id}').replaceWith(component);
        </script>
      </div>
    `;
  }

  // Default entry point for module UI
  async index(req) {
    throw new Error('Index not implemented');
  }

  // Helper to update connected clients
  async update(instanceId, data) {
    server.realtime.broadcast(this.name, instanceId, data);
  }

  async getState(instanceId) {
    // Get state for specific instance
    const allState = await this.core.config.readConfig() || {};
    return allState[instanceId] || {};
  }

  async setState(instanceId, instanceState) {
    // Read current state
    const allState = await this.core.config.readConfig() || {};
    
    // Update just this instance's state
    allState[instanceId] = instanceState;
    
    // Persist to config
    await this.core.config.writeConfig(allState);
    
    // Update realtime instance
    await this.update(instanceId, instanceState);
    
    return instanceState;
  }
}

export default core;