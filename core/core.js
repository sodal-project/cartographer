const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Core Imports
const { readFromMongo, writeToMongo, deleteFromMongo } = require('./mongo.js');

/**
 * ------------------------------------------------
 * Private Functions
 * ------------------------------------------------
 */

/**
 * Get Calling Folder
 * Check the stack trace to determine the calling folder.
 * 
 * @param {string} stack - The stack trace from an Error object
 * @returns {string} The name of the calling folder
 */ 
function utilGetCallingFolder(stack) {
  const callerFile = stack.split('\n')[2].trim().match(/\((.*):\d+:\d+\)/)[1];
  const folderName = path.basename(path.dirname(callerFile));
  return folderName;
}

/**
 * Get Formatted data
 * Return the current date and time in the format MM-DD-YYYY_HH:MM:SS
 * 
 * @returns {string} The current data in the format MM-DD-YYYY_HH:MM:SS
 */ 
function getFormattedDate() {
  const date = new Date();
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${month}-${day}-${year}_${hours}:${minutes}:${seconds}`;
}

/**
 * ------------------------------------------------
 * Public Functions
 * ------------------------------------------------
 */

/**
 * Log
 * @description Log a message to a file
 * @param {string} message - The message to log
 */
function log(message, type='UNKNOWN_TYPE') {
  // Create log message
  const timestamp = getFormattedDate();
  const moduleName = utilGetCallingFolder(new Error().stack);
  const authLevel = `AUTH_0`;
  const logMessage = `${timestamp}, ${moduleName}, ${message}, ${type}, ${authLevel}`;

  // Define log file path
  const logsDir = path.join(process.cwd(), 'logs');
  const logFilePath = path.join(logsDir, 'log.csv');

  // Ensure the logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  // Check if the log file exists
  const fileExists = fs.existsSync(logFilePath);

  // If the file doesn't exist, create it and add the header row
  if (!fileExists) {
    const header = 'timestamp, module, message, type, authorization\n';
    fs.writeFileSync(logFilePath, header, 'utf8');
  }

  // Append the log message to log.csv
  fs.appendFileSync(logFilePath, `${logMessage}\n`, 'utf8');

  // Log the message to the console
  console.log(logMessage);
}

/**
 * Read Config
 * 
 * @param {object} data - The data to write to the config file
 */
async function readConfig() {
  const moduleName = utilGetCallingFolder(new Error().stack);
  const data = await readFromMongo(moduleName);
  return data;
}

/**
 * Write Config
 * 
 * @param {object} data - The data to write to the config file
 */
async function writeConfig(data) {
  const moduleName = utilGetCallingFolder(new Error().stack);
  
  try {
    await writeToMongo(moduleName, data);
  } catch (err) {
    console.error(`Error in writeConfig: ${err}`);
  }
}

/**
 * Delete Config
 * 
 * @param {string} property - The property to delete from the namespace
 */
async function deleteConfig(property) {
  const moduleName = utilGetCallingFolder(new Error().stack);
  
  try {
    await deleteFromMongo(moduleName, property);
  } catch (err) {
    console.error(`Error in deleteConfig: ${err}`);
  }
}

module.exports = {
  log,
  readConfig,
  writeConfig,
  deleteConfig,
};
