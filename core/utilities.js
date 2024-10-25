const path = require('path');

/**
 * Get Calling Folder
 * Check the stack trace to determine the calling folder.
 * 
 * @param {string} stack - The stack trace from an Error object
 * @returns {string} The name of the calling folder
 */ 
function getCallingFolder(stack) {
  try {
    const callerFile = stack.split('\n')[2].trim().match(/\((.*):\d+:\d+\)/)[1];
    const folderName = path.basename(path.dirname(callerFile));
    return folderName;
  } catch (err) {
    return "client";
  }
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

module.exports = {
  getCallingFolder,
  getFormattedDate,
};
