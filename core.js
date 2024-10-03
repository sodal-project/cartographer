const fs = require('fs');
const path = require('path');

/**
 * ------------------------------------------------
 * Private Functions
 * ------------------------------------------------
 */
function addPersonaToDatabase() {
  return { value: 'persona added to database' };
}

function getDataFromDatabase() {
  return { value: 'data from database' };
}

/**
 * Get Calling Folder
 * Check the stack trace to determine the calling folder.
 * 
 * @param {string} stack - The stack trace from an Error object
 */ 
function utilGetCallingFolder(stack) {
  const callerFile = stack.split('\n')[2].trim().match(/\((.*):\d+:\d+\)/)[1];
  const folderName = path.basename(path.dirname(callerFile));
  return folderName;
}

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
  const logMessage = `${timestamp}, ${moduleName}, ${message}, ${type}, ${authLevel}\n`;

  // Define log file path
  const logsDir = path.join(__dirname, 'logs');
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
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

function savePersona() {
  return addPersonaToDatabase();
}

function getData() {
  return getDataFromDatabase();
}

module.exports = {
  log,
  savePersona,
  getData
};
