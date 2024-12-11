import core from './core.js';
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
import { getCallingFolder } from './utilities.js';

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

  // Simplified state management
  async getState(instanceId) {
    // Read all state for this module
    const moduleState = await this.core.config.readConfig() || {};
    
    // Return just this instance's state or empty object
    return moduleState[instanceId] || {};
  }

  async setState(instanceId, newState) {
    // Read current module state
    const moduleState = await this.core.config.readConfig() || {};
    
    // Update just this instance's state
    moduleState[instanceId] = newState;
    
    // Write back full module state
    await this.core.config.writeConfig(moduleState);
    
    // Broadcast just this instance's state
    await this.update(instanceId, newState);
    
    return newState;
  }

  // Simplified component rendering
  async renderComponent(name, props = {}) {
    const { id, moduleName = this.name } = props;
    return `
      <div id="component-mount-${id}">
        <script type="module">
          // Ensure CoreClientModule is loaded
          if (!window.CoreClientModule) {
            await import('/public/js/CoreClientModule.js');
          }
          
          // Load the module's client code
          await import('/public/${moduleName}/client.js');
          
          // Create and mount the component
          const component = document.createElement('${name}');
          component.id = '${id}';
          const mount = document.getElementById('component-mount-${id}');
          if (mount) {
            mount.replaceWith(component);
          }
        </script>
      </div>
    `;
  }

  // Simplified update broadcast
  async update(instanceId, data) {
    this.core.server.realtime.broadcast(this.name, instanceId, data);
  }

  // Default entry point for module UI
  async index(req) {
    throw new Error('Index not implemented');
  }
}
