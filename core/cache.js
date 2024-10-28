const fs = require('fs').promises;
const path = require('path');
const sanitize = require('sanitize-filename');

const localPath = './data/';

/**
 * Save a JSON object to a file in the local data directory
 * 
 * moduleName and saveName are sanitized to prevent directory traversal attacks
 * 
 * @param {string} moduleName - automatically assigned by core based on calling module
 * @param {string} saveName - a unique identifier for the save provided by the calling module
 * @param {object} jsonObjectOutput 
 * @returns {boolean} true if save is successful, false if save fails
 */
const save = async (moduleName, saveName, jsonObjectOutput) => {
  try {
    const cleanModuleName = sanitize(moduleName);
    const cleanSaveName = sanitize(saveName);
    if(!cleanModuleName){
      throw new Error("ModuleName is empty or invalid. Received: " + moduleName);
    } else if(!cleanSaveName){
      throw new Error("SaveName is empty or invalid. Received: " + saveName);
    }
    const savePathString = localPath + cleanModuleName + '-' + cleanSaveName + '.json';
    const savePath = path.join(process.cwd(), savePathString);
    await fs.writeFile(savePath, JSON.stringify(jsonObjectOutput, false, 4));
    return true;
  } catch (err) {
    console.error(`Error saving cache for module ${moduleName}: ${saveName}`);
    console.error(err);
    return false;
  } 
}

/**
 * Load a JSON object from a file in the local data directory
 * 
 * moduleName and loadName are sanitized to prevent directory traversal attacks
 * 
 * @param {string} moduleName - automatically assigned by core based on calling module
 * @param {string} loadName - a unique identifier for the load provided by the calling module
 * @returns {boolean|object} false if load fails, or the loaded JSON object
 */
const load = async (moduleName, loadName) => {
  try {
    const cleanModuleName = sanitize(moduleName);
    const cleanLoadName = sanitize(loadName);
    if(!cleanModuleName){
      throw new Error("ModuleName is empty or invalid. Received: " + moduleName);
    } else if(!cleanLoadName){
      throw new Error("SaveName is empty or invalid. Received: " + loadName);
    }
    const loadPathString = localPath + cleanModuleName + '-' + cleanLoadName + '.json';
    const loadPath = path.join(process.cwd(), loadPathString);
    const content = await fs.readFile(loadPath);
    return JSON.parse(content);
  } catch (err) {
    console.error("Cache not found for " + loadName);
    return false;
  }
}

module.exports = {
  save,
  load,
}