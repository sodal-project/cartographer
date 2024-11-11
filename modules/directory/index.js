const core = require('../../core/core.js');

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

  const id = "p" + await nextParticipantId();
  let friendlyName = (data.firstName ? `${data.firstName}` : "");
  friendlyName += (data.lastName ? ` ${data.lastName}` : "");
  friendlyName += (data.handle ? ` (${data.handle})` : "");

  const personaObject = {
    upn: "upn:directory:participant:" + id,
    type: "participant",
    platform: "directory",
    id: id,
    friendlyName: friendlyName,
    ...data
  }

  core.check.personaObject(personaObject);

  console.log(`Adding participant: ${JSON.stringify(personaObject)}`);

  await core.graph.mergePersona(personaObject);

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

  const id = "a" + await nextActivityId();

  const activityObject = {
    upn: "upn:directory:activity:" + id,
    type: "activity",
    platform: "directory",
    id: id,
    ...data
  }

  core.check.personaObject(activityObject);

  console.log(`Adding activity: ${JSON.stringify(activityObject)}`);

  await core.graph.mergePersona(activityObject);

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

async function link(formData) {

  console.log(`Linking personas`, formData);

  if(!formData.directory || !formData.persona) {
    throw new Error("Both directory and persona must be selected");
  }

  const level = 9 // ADMIN
  const confidence = .5;
  const directoryUpns = Array.isArray(formData.directory) ? formData.directory : [formData.directory];
  const personaUpns = Array.isArray(formData.persona) ? formData.persona : [formData.persona];
  const queries = [];

  for(const directoryUpn of directoryUpns) {
    queries.push(await core.graph.linkPersona(directoryUpn, personaUpns, level, confidence, null, true));
  }

  return redraw();
}

async function nextParticipantId() {
  const nextParticipantId = await core.config.readConfig('nextParticipantId');
  if(nextParticipantId) {
    await core.config.writeConfig({ nextParticipantId: nextParticipantId + 1 });
    return nextParticipantId;
  } else {
    await core.config.writeConfig({ nextParticipantId: 2 });
    return 1;
  }
}

async function nextActivityId() {
  const nextActivityId = await core.config.readConfig('nextActivityId');
  if(nextActivityId) {
    await core.config.writeConfig({ nextActivityId: nextActivityId + 1 });
    return nextActivityId;
  } else {
    await core.config.writeConfig({ nextActivityId: 2 });
    return 1;
  }
}

module.exports = {
  index,
  addParticipant,
  addActivity,
  deletePersonas,
  link,
};
