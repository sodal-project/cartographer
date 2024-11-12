const core = require('../../core/core.js');
const { Readable } = require('stream');
const csvtojson = require('csvtojson');

/**
 * @description Get the next unused file id number
 * @returns {number} - The next available file identification number
 */
async function getNextFileId() {
  const files = await core.config.readConfig("files") || {};

  let highestId = 0;
  for(const fileId in files) {
    if(fileId > highestId) {
      highestId = fileId;
    }
  }
  return parseInt(highestId) + 1;
}

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw() {
  const data = await core.config.readConfig();
  return core.client.render('csv.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function csvIndex() {
  return redraw();
}

/**
 * @description Handle adding a new Slack integration instance
 * @param {object} formData - The form data
 */
async function csvAddFile(formData) {
  const files = await core.config.readConfig("files") || {};
  const fileId = await getNextFileId();
  const fileData = await csvtojson().fromStream(Readable.from(formData.file.buffer));
  const fileName = formData.fileName;
  const fileDate = new Date();

  console.log('Adding file:', formData.fileName);

  files[fileId] = {
    fileId,
    fileName,
    fileData,
    fileDate,
  };

  await core.config.writeConfig({ files });

  return redraw();
}

async function csvDeleteFile(formData) {
  const files = await core.config.readConfig("files")
  const fileId = formData.fileId;

  if(files[fileId]) {
    console.log('Deleting file:', files[fileId].fileName);
    // await core.graph.deleteSource(`source:csv:${fileId}`);
    await core.config.deleteConfig(`files.${fileId}`);
  } 

  return redraw();
}

/**
 * 
 * @param {object} instance 
 */
const csvMerge = async (formData, source) => {

  core.check.sourceObject(source);

  const files = await core.config.readConfig("files")

  const file = files[formData.fileId];

  console.log('Merging file:', file.fileName);

  const fileId = file.fileId;
  const fileName = file.fileName;
  const fileData = file.fileData;

  try {
    source.lastUpdate = new Date().toISOString();

    console.log(`Processing CSV file ${fileName}...`);
    const r0 = fileData[0];
    let personas = [];

    // process personas csv
    if(r0.hasOwnProperty("id")&&r0.hasOwnProperty("type")&&r0.hasOwnProperty("platform")){
      console.log('Processing personas...');
      personas = personas.concat(mapCsvPersonas(fileData));

    // process relationships csv
    } else if(r0.hasOwnProperty("controlUpn")&&r0.hasOwnProperty("obeyUpn")){
      console.log('Processing relationships...');
      const relationships = mapCsvRelationships(fileData);
      personas = personas.concat(core.persona.getFromRelationships(relationships));

    } else {
      throw Error('CSV file does not contain the required columns');
    }

    await core.graph.mergePersonas(personas, source);

    console.log(`CSV file processed successfully`);

  } catch (error) {
    console.error('Error processing CSV file:', error);
  }

  return redraw();
}

const mapCsvPersonas = (data) => {
  const personas = [];
  for(const i in data) {
    if(i === 0) { continue; }
    const persona = {
      upn: `upn:${data[i].platform}:${data[i].type}:${data[i].id}`,
      ...data[i]
    }
    persona.id = `${persona.id}`;
    personas.push(persona);
  }
  return personas;
}

const mapCsvRelationships = (data) => {
  const relationships = [];
  for(const i in data) {
    if(i === 0) { continue; }
    const rel = data[i];
    rel.level = parseInt(rel.level);
    rel.confidence = parseFloat(rel.confidence);
    relationships.push(data[i]);
  }
  return relationships;
}

module.exports = {
  csvIndex,
  csvAddFile,
  csvDeleteFile,
  csvMerge,
};