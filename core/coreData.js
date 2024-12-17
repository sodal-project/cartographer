
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
const coreData = {
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
      category: "Components",
      accessLevel: "admin"
    },
    {
      folder: "export-csv",
      label: "Export CSV",
      category: "Components",
      accessLevel: "admin"
    },
    {
      folder: "test-config",
      label: "Test Config",
      category: "Testing",
      accessLevel: "admin"
    },
    {
      folder: "test-long-process",
      label: "Test Long Process",
      category: "Testing",
      accessLevel: "admin"
    },
    {
      folder: "test-ping",
      label: "Test Ping",
      category: "Testing",
      accessLevel: "admin"
    },
    {
      folder: "test-submodule",
      label: "Test Submodule",
      category: "Testing",
      accessLevel: "admin"
    },
    {
      folder: "test-interconnect",
      label: "Test Interconnect",
      category: "Testing",
      accessLevel: "admin"
    },
  ]
};

export default coreData;