const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Core Imports
const { getFormattedDate } = require('./utilities.js');

/**
 * writeLog
 * Write a log message to a file. If the file doesn't exist, create it.
 * 
 * @param {string} message - The message to log
 */
function writeLog(moduleName, message, type) {
  // Create log message
  const timestamp = getFormattedDate();
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
 * consoleLog
 * Use this to log messages to the console instead of console.log so
 * they can be muted by adding CONSOLE_MUTED=true to the env file.
 * 
 * @param {string} message - The message to log
 */
function consoleLog(msg) {
  if (process.env.CONSOLE_MUTED != 'true') {
    console.log(msg);
  }
}

module.exports = {
  writeLog,
  consoleLog,
};
