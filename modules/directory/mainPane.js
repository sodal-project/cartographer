const core = require('../../core/core.js');
const csv = require('./csvPane.js');

// Default Configuration
// TODO: move this to config database
const directorySource = core.source.getSourceObject('directory', 'v1', 'Directory V1');

const directoryTableConfig = {
  tableFormId: "directory-table-form",
  action: {
    label: "Delete",
    endpoint: "/mod/directory/deletePersonas",
  },
  forceFilters: [
    {
      type: "field",
      key: "platform",
      value: "directory",
      operator: "=",
      not: false
    }
  ],
}

const personaTableConfig = {
  tableFormId: "persona-table-form",
  forceFilters: [
    {
      type: "field",
      key: "type",
      value: "participant",
      operator: "<>",
      not: false
    }
  ],
  forceVisibility: [
    "upn",
    "type",
    "platform",
    "friendlyName",
    "firstName",
    "lastName",
    "handle",
  ]
}

/**
 * @description Render the Directory main page
 * 
 * The main page renders two tables:
 * -- The Directory table, which displays all personas in the directory
 * -- The Personas table, which displays all non-participant personas in the graph
 * 
 * The main page also includes forms for adding participants and activities to the directory
 * 
 * @param {object} formData - Form data generated by Directory iterations
 * @returns {string} - Compiled HTML content for the Directory pane
 */
async function redraw(formData) {

  const directory = await core.mod.personaTable.build(directoryTableConfig);
  const personas = await core.mod.personaTable.build(personaTableConfig);

  const data = {
    directory: { tableData: directory },
    personas: { tableData: personas },
  };
  
  // Render the mainPane.hbs template
  return core.client.render('mainPane.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function mainPane() {
  return redraw();
}

/**
 * @description Add a participant to the graph
 * 
 * @param {object} formData - Data from the Add Participant form
 * @returns {string} - Compiled HTML content for the Directory pane
 */
async function addParticipant(formData) {
  // Extract the form data
  const data = { 
    firstName: formData.firstName,
    lastName: formData.lastName,
    handle: formData.handle,
  };

  // Generate a new ID for the participant
  const id = await nextId("Participant");

  // Build a friendly name from the form data
  let friendlyName = (data.firstName ? `${data.firstName}` : "");
  friendlyName += (data.lastName ? ` ${data.lastName}` : "");
  friendlyName += (data.handle ? ` (${data.handle})` : "");

  // Build the persona object
  const personaObject = {
    upn: "upn:directory:participant:" + id,
    type: "participant",
    platform: "directory",
    id: id.toString(),
    friendlyName: friendlyName,
    ...data
  }
  core.check.personaObject(personaObject);

  console.log(`Adding participant: ${JSON.stringify(personaObject)}`);

  await core.graph.mergePersona(personaObject, directorySource);

  return redraw();
}

/**
 * @description Add an activity to the graph
 * 
 * @param {object} formData - The data from Add Activity form
 * @returns {string} - Compiled HTML content for the Directory pane
 */
async function addActivity(formData) {
  // Extract the form data
  const data = { 
    friendlyName: formData.name,
  };

  // Generate a new ID for the activity
  const id = await nextId("Activity");

  // Build the persona object
  const activityObject = {
    upn: "upn:directory:activity:" + id,
    type: "activity",
    platform: "directory",
    id: id.toString(),
    ...data
  }

  core.check.personaObject(activityObject);

  console.log(`Adding activity: ${JSON.stringify(activityObject)}`);

  await core.graph.mergePersona(activityObject, directorySource);

  return redraw();
}

/**
 * @description Delete personas from the directory
 * 
 * @param {object} formData - The data from the Delete Personas request
 * @returns {string} - Compiled HTML content for the Directory pane
 */
async function deletePersonas(formData) {

  // Extract the form data
  const upns = Array.isArray(formData.upn) ? formData.upn : [formData.upn];

  console.log(`Deleting personas`, upns);

  for(const upn of upns) {
    await core.graph.deletePersona(upn);
  }
  return redraw();
}

/**
 * @description Link personas in the directory
 * 
 * @param {object} formData - The data from the Link Personas request
 * @returns {string} - Compiled HTML content for the Directory pane
 */
async function linkPersonas(formData) {

  if(!formData.directory || !formData.persona) {
    throw new Error("Both directory and persona must be selected");
  }

  // Extract the form data
  const level = 9 // ADMIN
  const confidence = .5;
  const directoryUpns = Array.isArray(formData.directory) ? formData.directory : [formData.directory];
  const personaUpns = Array.isArray(formData.persona) ? formData.persona : [formData.persona];
  const personas = [];

  // Generate link queries; all selected directory upns will be linked to all selected personas
  for(const directoryUpn of directoryUpns) {
    for(const personaUpn of personaUpns) {
      const persona = core.persona.newFromUpn(personaUpn);
      persona.control.push({
        upn: directoryUpn,
        level: level,
        confidence: confidence,
      })
      personas.push(persona);
    }
  }

  await core.graph.mergePersonas(personas, directorySource);

  console.log(`Processed ${personas.length} persona links`);

  return redraw();
}

/**
 * @description Generate the next ID for a persona type
 * 
 * @param {"Participant" || "Activity"} type - The persona type
 * @returns {number} - The next ID
 */
async function nextId(type) {
  // Get the next ID from the config database
  let nextId = await core.config.readConfig(`next${type}Id`) || 10000; 

  // Verify that graph does not have a lower ID
  const rawPersonas = await core.graph.readPersonas([{ 
    type: "field",
    key: "platform",
    value: "directory",
    operator: "=",
    not: false
  },{
    type: "field",
    key: "type",
    value: type,
    operator: "=",
    not: false
  }]);

  const personas = rawPersonas.records.map(node => node._fields[0].properties);

  for(const persona of personas) {
    const id = parseInt(persona.id);
    if(id > nextId) {
      nextId = id + 1;
    }
  }

  // update the configuration database 
  await core.config.writeConfig({ [`next${type}Id`]: nextId + 1 });

  return nextId;
}

/**
 * @description Render the CSV pane
 * 
 * @returns {string} - Compiled HTML content for the CSV pane
 */
async function csvPane() {
  return csv.csvPane();
}

/**
 * @description Add a CSV file to the directory
 * 
 * @param {object} formData - Data from the CSV form submission
 * @returns {string} - Compiled HTML content for the CSV pane
 */
async function csvAddFile(formData) {
  return csv.csvAddFile(formData);
}

/**
 * @description Delete a CSV file from the directory
 * 
 * @param {object} formData - Data from the CSV form submission
 * @returns {string} - Compiled HTML content for the CSV pane
 */
async function csvDeleteFile(formData) {
  return csv.csvDeleteFile(formData);
}

/**
 * @description Merge CSV files with the Directory as source
 * 
 * @param {object} formData - Data from the CSV form submission
 * @returns {string} - Compiled HTML content for the CSV pane
 */
async function csvMerge(formData) {
  return csv.csvMerge(formData, directorySource);
}

function getPersonaCustomProperties(persona) {
  const keysToFilterOut = [
    "upn",
    "control",
    "obey",
  ];

  const filteredProperties = Object.entries(persona).reduce((accumulator, [key, value]) => {
    if (!keysToFilterOut.includes(key)) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
  const filteredPropertiesArray = Object.keys(filteredProperties).map(key => ({ key: key, value: filteredProperties[key] }));
  const sortedPropertiesArray = filteredPropertiesArray.sort((a, b) => a.key.localeCompare(b.key));
  return sortedPropertiesArray;
}

/**
 * @description Provide a detail subpane for a persona
 * @param {string} upn 
 * @returns {object} - The subpane object
 */
async function getDetailSubpane(upn) {
  // Find a persona object in the graph
  const persona = await core.graph.readPersona(upn);
  if (!persona) {
    console.error(`Persona not found for upn: ${upn}`);
    return {};
  }

  // Get the custom properties for grid display
  const customProperties = getPersonaCustomProperties(persona);
  
  // Define the configuration for the tables we want to display
  const aliasTableConfig = {
    tableFormId: "directory-subpane-alias",
    forceFilters: [
      {
        "type":"agency",
        "key":"obey",
        "levels": ["ALIAS"],
        "filter": [
          {
            "type":"field",
            "key":"upn",
            "value":upn,
            "operator":"=",
          }
        ],
      }
    ]
  };
  const controlTableConfig = {
    tableFormId: "directory-subpane-control",
    forceFilters: [
      {
        "type":"agency",
        "key":"obey",
        "levels": ["ADMIN", "MANAGE", "ACT_AS"],
        "filter": [
          {
            "type":"field",
            "key":"upn",
            "value":upn,
            "operator":"=",
          },
        ],
      }
    ]
  }
  const obeyTableConfig = {
    tableFormId: "directory-subpane-obey",
    forceFilters: [
      {
        "type":"agency",
        "key":"control",
        "levels": ["ADMIN", "MANAGE", "ACT_AS", "DIRECT"],
        "filter": [
          {
            "type":"field",
            "key":"upn",
            "value":upn,
            "operator":"=",
          },
        ],
      }
    ]
  }

  const aliasTableData = await core.mod.personaTable.build(aliasTableConfig)
  const controlTableData = await core.mod.personaTable.build(controlTableConfig)
  const obeyTableData = await core.mod.personaTable.build(obeyTableConfig)

  return {
    component: "DirectoryDetailSubpane",
    data: {
      persona,
      customProperties,
      aliasTableData,
      controlTableData,
      obeyTableData,
    }
  }
}

/**
 * @description Initialize the module and register partials
 * @returns {void}
 */
async function init(){
  await core.client.registerPartials();
}

module.exports = {
  mainPane,
  csvPane,
  csvAddFile,
  csvDeleteFile,
  csvMerge,
  addParticipant,
  addActivity,
  deletePersonas,
  linkPersonas,
  getDetailSubpane,
  init,
};