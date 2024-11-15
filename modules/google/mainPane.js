const core = require('../../core/core.js');
const google = require('./google.js');
const crypto = require('crypto');
const { Readable } = require('stream');

/**
 * @description Fetch data from the config database namespace and render the index.hbs template
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
 * @description Handle adding a new Google integration instance
 * @param {object} formData - The form data
 */
async function addInstance(formData) {
  if(
    !formData.name || 
    !formData.file || 
    !formData.subjectEmail || 
    !formData.customerId 
  ) {
    throw new Error('Missing required fields');
  }

  const id = crypto.randomBytes(10).toString('hex');
  const name = formData.name;
  const subjectEmail = formData.subjectEmail;
  const customerId = formData.customerId;
  const fileString = formData.file.buffer.toString()
  const encryptedFile = await core.crypto.encrypt(fileString);

  const instance = {
    id,
    name,
    subjectEmail,
    customerId,
    encryptedFile,
    lastSync: null,
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
    console.log('Deleting Google Instance: ', instances[id].name);
    await core.graph.deleteSource(`source:google:${id}`);
    await core.config.deleteConfig(`instances.${id}`);
  } else {
    console.log(`Instance ${id} not found`);
  }

  return redraw();
}

async function sync(formData) {
  const instances = await core.config.readConfig("instances");
  const instance = instances[formData.id];

  if(!instance) {
    throw new Error('Instance not found');
  } else if(!instance.ready) {
    console.log('Instance not ready, skipping sync');
    return redraw();
  } else {
    console.log('Syncing instance:', instance.name);
    instance.ready = false;
    await core.config.writeConfig({ instances });

    google.sync(instance).then(async () => {
      instance.ready = true;
      instance.lastSync = new Date();
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