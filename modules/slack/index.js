const core = require('../../core/core.js');
const slack = require('./slack.js');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
 * @returns {string} - Compiled HTML content
 */
async function redraw() {
  const data = await core.config.readConfig();
  return core.client.render('index.hbs', data);
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
  if(!formData.name || !formData.teamId || !formData.token) {
    throw new Error('Missing required fields');
  }

  const configData = await core.config.readConfig();
  const instances = configData?.instances || {};
  const secret = await core.crypto.encrypt(formData.token);

  const instance = {
    name: formData.name,
    teamId: formData.teamId,
    secret: secret,
    ready: true,
  }
  instances[formData.teamId] = instance;

  await core.config.writeConfig({ instances });

  return redraw();
}

async function deleteInstance(formData) {
  const instances = await core.config.readConfig("instances");
  const teamId = formData.teamId;

  if(instances[teamId]) {
    console.log('Deleting Slack Instance: ', instances[teamId].name);
    await core.graph.deleteSource(`source:slack:${teamId}`);
    await core.config.deleteConfig(`instances.${teamId}`);
  } else {
    console.log(`Instance ${teamId} not found`);
  }

  return redraw();
}

async function sync(formData) {
  const instances = await core.config.readConfig("instances");
  const teamId = formData.teamId;
  const instance = instances[teamId];

  if(!instance) {
    throw new Error('Instance not found');
  } else if(!instance.ready) {
    console.log('Instance not ready, skipping sync');
    return redraw();
  } else {
    console.log('Syncing instance:', instance.name);
    instance.ready = false;
    await core.config.writeConfig({ instances });

    console.log(new Error().stack);

    slack.sync(instance).then(async () => {
      instance.ready = true;
      console.log(new Error().stack);
      console.log(`Instance ${instance.name} is ready`);
      await core.config.writeConfig({ instances });
    });
  }

  return redraw();
}

async function init() {
  return await slack.init();
}

module.exports = {
  index,
  addInstance,
  deleteInstance,
  sync,
  init,
};