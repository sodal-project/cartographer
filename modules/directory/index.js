const core = require('../../core/core.js');
const csv = require('./csv.js');

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
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw(formData) {

  const directory = await core.mod.personaTable.build(directoryTableConfig);
  const personas = await core.mod.personaTable.build(personaTableConfig);

  const data = {
    directory: { tableData: directory },
    personas: { tableData: personas },
  };
  
  // Render the index.hbs template
  return core.client.render('index.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function index() {
  return redraw();
}

/**
 * Add a persona to the graph
 * @param {object} formData - The data from the form
 * @returns {string} - Compiled HTML content
 */
async function addParticipant(formData) {
  const data = { 
    firstName: formData.firstName,
    lastName: formData.lastName,
    handle: formData.handle,
  };

  const id = await nextId("Participant");

  let friendlyName = (data.firstName ? `${data.firstName}` : "");
  friendlyName += (data.lastName ? ` ${data.lastName}` : "");
  friendlyName += (data.handle ? ` (${data.handle})` : "");

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
 * Add an activity to the graph
 * @param {object} formData - The data from the form
 * @returns {string} - Compiled HTML content
 */
async function addActivity(formData) {
  const data = { 
    friendlyName: formData.name,
  };

  const id = await nextId("Activity");

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
 * Add a persona to the graph
 * @param {object} formData - The data from the form
 * @returns {string} - Compiled HTML content
 */
async function deletePersonas(formData) {

  const upns = Array.isArray(formData.upn) ? formData.upn : [formData.upn];

  console.log(`Deleting personas`, upns);

  for(const upn of upns) {
    await core.graph.deletePersona(upn);
  }
  return redraw();
}

async function linkPersonas(formData) {

  console.log(`Linking personas`, formData);

  if(!formData.directory || !formData.persona) {
    throw new Error("Both directory and persona must be selected");
  }

  const level = 9 // ADMIN
  const confidence = .5;
  const directoryUpns = Array.isArray(formData.directory) ? formData.directory : [formData.directory];
  const personaUpns = Array.isArray(formData.persona) ? formData.persona : [formData.persona];
  const sourceId = directorySource.id;
  const queries = [];

  for(const directoryUpn of directoryUpns) {
    for(const personaUpn of personaUpns) {
      queries.push(await core.graph.linkPersona(directoryUpn, personaUpn, level, confidence, sourceId, true));
    }
  }

  await core.graph.runRawQueryArray(queries);

  console.log(`Processed ${queries.length} link queries`);

  return redraw();
}

async function nextId(type) {
  let nextId = await core.config.readConfig(`next${type}Id`) || 10000; 

  const rawPersonas = await core.graph.readAgents([{ 
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

  await core.config.writeConfig({ [`next${type}Id`]: nextId + 1 });
  return nextId;
}

async function csvIndex() {
  return csv.csvIndex();
}

async function csvAddFile(formData) {
  return csv.csvAddFile(formData);
}

async function csvDeleteFile(formData) {
  return csv.csvDeleteFile(formData);
}

async function csvMerge(formData) {
  return csv.csvMerge(formData, directorySource);
}

module.exports = {
  index,
  csvIndex,
  csvAddFile,
  csvDeleteFile,
  csvMerge,
  addParticipant,
  addActivity,
  deletePersonas,
  linkPersonas,
};
