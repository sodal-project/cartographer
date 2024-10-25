const core = require('../../core/core.js');
const { Readable } = require('stream');
const csv = require('./csv.js');
const csvtojson = require('csvtojson');

/**
 * @description Get the next unused file id number
 * @returns {number} - The next available file identification number
 */
async function getNextFileId() {
  const nextFileId = await core.config.readConfig("nextFileId") || 1;

  await core.config.writeConfig({ nextFileId: nextFileId + 1 });

  return nextFileId;
}

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw() {
  const data = await core.config.readConfig();
  return core.render('index.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function index() {
  return redraw();
}

/**
 * @description Handle adding a new Slack integration instance
 * @param {object} formData - The form data
 */
async function addFile(formData) {
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

async function deleteFile(formData) {
  const files = await core.config.readConfig("files")
  const fileId = formData.fileId;

  if(files[fileId]) {
    console.log('Deleting file:', files[fileId].fileName);
    await core.graph.deleteSource(`source:csv:${fileId}`);
    await core.config.deleteConfig(`files.${fileId}`);
  } 

  return redraw();
}

async function merge(formData) {
  const files = await core.config.readConfig("files")

  const file = files[formData.fileId];

  console.log('Merging file:', file.fileName);

  const response = await csv.merge(file.fileId, file.fileName, file.fileData);

  return redraw();
}

async function init() {
  return await csv.init();
}

module.exports = {
  index,
  addFile,
  deleteFile,
  merge,
  init,
};