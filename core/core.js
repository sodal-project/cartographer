/**
 * @fileoverview Core system interface
 */
import path from 'path';
import fs from 'fs';
import Handlebars from 'handlebars';
import { consoleLog } from './log.js';
import { CoreModule } from './CoreModule.js';

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
      {
        folder: "persona-table",
        label: "Persona Table",
        category: "System",
        accessLevel: "admin"
      },
      {
        folder: "export-csv",
        label: "Export CSV",
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
      {
        folder: "test-interconnect",
        label: "Test Interconnect",
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

  registerPartials();

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

// Register Partials Manually
const registerPartials = () => {

  const partialsDir = `/app/components`;

  const readPartials = (dir) => {
    if (!fs.existsSync(dir)) {
      return;
    }

    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recursively read subdirectory
        readPartials(filePath);
      } else if (file.endsWith('.hbs')) {
        const name = path.relative(partialsDir, filePath).replace(/\\/g, '/').replace('.hbs', '');
        const template = fs.readFileSync(filePath, 'utf8');

        // Register the partial with the relative path name
        Handlebars.registerPartial(name, template);
      }
    });
  };

  // Start reading partials from the root directory
  readPartials(partialsDir);
};

export { CoreModule };
export default core;