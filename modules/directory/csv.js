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
 * @description Render the CSV main page
 * @returns {string} - Compiled HTML content
 */
async function redraw() {
  const data = await core.config.readConfig();
  return core.client.render('csv.hbs', data);
}

/**
 * @description The main interface for the module.
 * 
 * This content must be rendered as innerHTML in the #directoryCsvPane element
 * 
 * @returns {string} - Compiled HTML content
 */
async function csvIndex() {
  return redraw();
}

/**
 * @description Add a CSV file for processing
 * 
 * This module requires a file passed by the /upload path middleware
 * 
 * @param {object} formData - Data from the CSV form submission
 * @returns {string} - Compiled HTML content
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

/**
 * @description Delete a CSV file from the system
 * 
 * Note that deleting a CSV file does not remove the data from the graph
 * 
 * @param {object} formData - Data from the CSV form submission
 * @returns {string} - Compiled HTML content
 */
async function csvDeleteFile(formData) {
  const files = await core.config.readConfig("files")
  const fileId = formData.fileId;

  if(files[fileId]) {
    console.log('Deleting file:', files[fileId].fileName);
    await core.config.deleteConfig(`files.${fileId}`);
  } 

  return redraw();
}

/**
 * @description Merge a CSV file into the graph
 * 
 * A merge is additive; existing data may be overwritten, but no data is deleted.
 * 
 * CSV files must be in a specific format:
 * 
 * Personas:
 * id,type,platform,name,description,{...}
 * 
 * Relationships:
 * controlUpn,obeyUpn,level,confidence,{...}
 * 
 * @param {object} formData - Data from the CSV form submission
 * @param {object} source - The source object associated with the data
 * @returns {string} - Compiled HTML content
 */
const csvMerge = async (formData, source) => {

  core.check.sourceObject(source);

  // get the file data
  const files = await core.config.readConfig("files")
  const fileId = formData.fileId;

  const file = files[fileId];
  const fileName = file.fileName;
  const fileData = file.fileData;

  console.log('Merging file:', fileName);

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

/**
 * @description Map JSON data from a CSV import to persona objects
 * 
 * @param {array} data - The data to map
 * @returns {array} - An array of persona objects
 */
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

/**
 * @description Map JSON data from a CSV import to relationship objects
 * 
 * @param {array} data - The data to map
 * @returns {array} - An array of relationship objects
 */
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