const core = require('../../core/core.js');

function writeConfig(data) {
  core.writeConfig(data);
  return {
    messages: 'module 2 wrote config data',
    data: data,
  }
}

async function readConfig() {
  const data = await core.readConfig();
  return {
    messages: 'module 2 read config data',
    data: data
  }
}

async function deleteConfig(data) {
  core.deleteConfig(data);
  return {
    messages: 'module 2 delete config data',
    data: data
  }
}

module.exports = {
  writeConfig,
  readConfig,
  deleteConfig,
};
