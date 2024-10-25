const fs = require('fs').promises;
const path = require('path');

const localPath = './data/';

const save = async (moduleName, saveName, jsonObjectOutput) => {
  try {
    const savePathString = localPath + moduleName + '-' + saveName + '.json';
    const savePath = path.join(process.cwd(), savePathString);
    await fs.writeFile(savePath, JSON.stringify(jsonObjectOutput, false, 4));
  } catch (err) {
    console.error("Failed to cache " + saveName);
    console.error(err);
    return null;
  } 
}

const load = async (moduleName, loadName) => {
  try {
    const loadPathString = localPath + moduleName + '-' + loadName + '.json';
    const loadPath = path.join(process.cwd(), loadPathString);
    const content = await fs.readFile(loadPath);
    return JSON.parse(content);
  } catch (err) {
    console.error("Cache not found for " + loadName);
    return null;
  }
}

module.exports = {
  save,
  load,
}