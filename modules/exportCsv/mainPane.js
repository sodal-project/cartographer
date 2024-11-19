const { Parser } = require('json2csv');
const core = require('../../core/core.js');

/**
 * @description Take an array of objects and returns all unique properties
 * 
 * @param {object[]} objects
 * @returns {string[]} - An array of all the properties
 */
function getUniqueProperties(objects) {
  // Set only stores unique values
  const uniqueProperties = new Set();
  
  objects.forEach(obj => {
    Object.keys(obj).forEach(key => {
      uniqueProperties.add(key);
    });
  });

  return Array.from(uniqueProperties);
}

/**
 * @description Returns a localized date string in the format MM-DD-YYYY
 * 
 * @returns {string} - The date formatted as MM-DD-YYYY
 */
function getShortDate() {
  const now = new Date(Date.now());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();

  return `${month}-${day}-${year}`;
}

/**
 * PUBLIC
 */

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function mainPane() {
  return core.client.render('mainPane.hbs', {});
}

/**
 * @description Download a CSV file of filtered personas
 * @param {object} formData - The filter object to pass the readPersonas function
 * @returns {string} - A CSV file and it's filename
 */
async function download(formData) {
  const filter = formData.csvFilter ? JSON.parse(formData.csvFilter) : [];

  // Get the persona data from the graph
  const response = await core.graph.readPersonas(filter);

  // Extract the properties from the raw data
  const personas = response.records.map(node => node._fields[0].properties);

  // Loop through all the personas and extract all unique properties
  const fields = getUniqueProperties(personas);

  // Convert personas to CSV
  const json2csvParser = new Parser({ fields });
  const file = json2csvParser.parse(personas);

  // Create a unique filename
  const fileName = `personas_${getShortDate()}.csv`;

  // Definte the file type
  const type = "text/csv";
  
  return {file, fileName, type};
}

module.exports = {
  mainPane,
  download,
};
