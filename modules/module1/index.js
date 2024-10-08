const core = require('../../core/core.js');

function writeConfig(data) {
  core.writeConfig(data);
  return {
    messages: 'module 1 wrote config data',
    data: data,
  }
}

async function readConfig() {
  const data = await core.readConfig();
  return {
    messages: 'module 1 read config data',
    data: data
  }
}

async function deleteConfig(data) {
  core.deleteConfig(data.delete);
  return {
    messages: 'module 1 delete config data',
    data: data
  }
}

module.exports = {
  writeConfig,
  readConfig,
  deleteConfig,
};
