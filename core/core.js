/**
 * @fileoverview Core system interface
 */
import { consoleLog } from './log.js';
import { CoreModule } from './CoreModule.js';
import coreData from './coreData.js';

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
  coreData,
  init,
  CoreModule,
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
  const initCalls = [];

  // load external module calls to core.mod.<module>.<call>
  for(const item in moduleArray) {
    const module = moduleArray[item].folder;

    // load the module
    const moduleImport = await import(`../modules/${module}/server.js`);
    const moduleExport = moduleImport.default;
    
    // Handle both class instances and regular objects
    calls.mod[module] = moduleExport;
    core.mod[module] = {};

    consoleLog(`Core: loading external module: ${module}`)

    // Get all properties, including overridden methods from class instances
    const properties = [
      ...Object.keys(moduleExport),
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(moduleExport))
    ];

    // Remove duplicates
    const uniqueProperties = [...new Set(properties)];

    // for each exported property in the module, add it to the core object
    for(const call of uniqueProperties) {
      // Skip constructor and internal properties
      if(call === 'constructor' || call === 'default' || call === 'core') {
        consoleLog(`Core: skipping ${call} for module: ${module}`)
        continue;
      // Handle init specially
      } 
      consoleLog(`Core: loading external module function: ${module}.${call}`)

      counter++;
      const property = moduleExport[call];
      
      // Handle both direct properties and prototype methods
      if(typeof property === 'function') {
        // add the function to the core object
        core.mod[module][call] = (...params) => {
          consoleLog(`Calling core.mod.${module}.${call} from an API call`)
          return moduleExport[call](...params);
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

export { CoreModule };
export default core;