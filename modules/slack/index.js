const core = require('../../core/core.js');
const slack = require('./slack.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw() {
  const data = await core.readConfig();
  return core.render('index.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function index() {
  return redraw();
}

/**
 * @description Handle adding a new Slack integration instance
 * @param {object} formData - The form data
 */
async function addInstance(formData) {
  const configData = await core.readConfig();
  const instances = configData?.instances || [];

  const instance = {
    name: formData.name,
    teamId: formData.teamId,
    token: formData.token
  }
  instances.push(instance);

  await core.writeConfig({ instances });

  return redraw();
}

async function deleteInstance(formData) {
  const configData = await core.readConfig();
  const instances = configData?.instances || [];

  const updatedInstances = instances.filter(instance => instance.teamId !== formData.teamId);

  await core.writeConfig({ instances: updatedInstances });

  return redraw();
}

async function merge(formData) {
  const configData = await core.readConfig();
  const instances = configData?.instances || [];

  const instance = instances.find(instance => instance.teamId === formData.teamId);

  console.log('Merging instance:', instance);

  const response = await slack.merge(instance);
  return redraw();
}

module.exports = {
  index,
  addInstance,
  deleteInstance,
  merge: merge,
  init: slack.init,
};