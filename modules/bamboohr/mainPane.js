const core = require('../../core/core.js');
const bamboohr = require('./bamboohr.js');
const crypto = require('crypto');

/**
 * @description 
 * @returns {string} - Compiled HTML content
 */
async function redraw() {
  const data = await core.config.readConfig();
  return core.client.render('mainPane.hbs', data);
}

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function mainPane() {
  return redraw();
}

/**
 * @description Handle adding a new BambooHR integration instance
 * @param {object} formData - The form data
 */
async function addInstance(formData) {
  if(!formData.name || !formData.subdomain || !formData.token || !formData.reportId) {
    throw new Error('Missing required fields');
  }

  const id = crypto.randomBytes(10).toString('hex');
  const secret = await core.crypto.encrypt(formData.token);

  const instance = {
    id,
    name: formData.name,
    subdomain: formData.subdomain,
    reportId: formData.reportId,
    secret: secret,
    ready: true,
  }

  const instances = await core.config.readConfig("instances") || {};
  instances[id] = instance;
  await core.config.writeConfig({ instances });

  return redraw();
}

async function deleteInstance(formData) {
  const instances = await core.config.readConfig("instances");
  const id = formData.id;

  if(instances[id]) {
    console.log('Deleting BambooHR Instance: ', instances[id].name);
    await core.graph.deleteSource(`source:bamboohr:${id}`);
    await core.config.deleteConfig(`instances.${id}`);
  } else {
    console.log(`BambooHR instance ${id} not found`);
  }

  return redraw();
}

async function sync(formData) {
  const instances = await core.config.readConfig("instances");
  const id = formData.id;
  const instance = instances[id];

  if(!instance) {
    throw new Error('Instance not found');
  } else if(!instance.ready) {
    console.log('Instance not ready, skipping sync');
    return redraw();
  } else {
    console.log('Syncing instance:', instance.name);
    instance.ready = false;
    await core.config.writeConfig({ instances });

    bamboohr.sync(instance).then(async () => {
      instance.ready = true;
      console.log(`Instance ${instance.name} is ready`);
      await core.config.writeConfig({ instances });
    });
  }

  return redraw();
}

module.exports = {
  mainPane,
  addInstance,
  deleteInstance,
  sync,
};