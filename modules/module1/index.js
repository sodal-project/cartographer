const core = require('../../core/core.js');

async function writeConfig(data) {
  const response = await core.writeConfig(data);
  const message = response ? 'module 1 wrote config data' : 'module 1 failed to write config data';
  return {
    messages: message,
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
  const response = await core.deleteConfig(data.delete);
  console.log('response', response);
  const message = response ? `module 1 deleted the property ${data.delete}` : `module 1 failed to delete the property ${data.delete}`;
  return {
    messages: message,
    data: data
  }
}

module.exports = {
  writeConfig,
  readConfig,
  deleteConfig,
};
