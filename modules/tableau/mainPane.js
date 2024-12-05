const core = require('../../core/core.js');
const crypto = require('crypto');
const axios = require('axios');
const LEVEL = core.constants.LEVEL;

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
 * @description Handle adding a new PowerBI integration instance
 * @param {object} formData - The form data
 */
async function addInstance(formData) {
  if(!formData.name || !formData.serverUrl || !formData.pat) {
    throw new Error('Missing required fields');
  }

  const id = crypto.randomBytes(10).toString('hex');
  const pat = await core.crypto.encrypt(formData.pat);

  const instance = {
    id,
    name: formData.name,
    serverUrl: formData.serverUrl.replace(/\/$/, ''),
    pat: pat,
    patName: formData.patName,
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
    console.log('Deleting Instance: ', instances[id].name);
    await core.graph.deleteSource(`source:tableau:${id}`);
    await core.config.deleteConfig(`instances.${id}`);
  } else {
    console.log(`Instance ${id} not found`);
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

    processInstance(instance).then(async (message) => {
      instance.ready = true;
      console.log(message);
      await core.config.writeConfig({ instances });
    });
  }

  return redraw();
}

async function processInstance(instance) {
  try {
    console.log('Syncing Instance: ', instance.name);

    const instanceId = instance.id;
    const orgName = instance.name;
    const serverUrl = instance.serverUrl;
    const pat = await core.crypto.decrypt(instance.pat);
    const patName = instance.patName;

    const source = core.source.getSourceObject('tableau', instanceId, orgName);

    const response = await callTableauAPI(serverUrl, pat, patName);
    await core.cache.save(`tableau-response`, response);

    const personas = [];
    // Process users here...

    return `Instance synced: ${orgName}`;
  } catch (error) {
    return `Error syncing instance: ${error.message}`;
  }
}

const callTableauAPI = async (serverUrl, pat, patName) => {
  const apiUrl = `${serverUrl}/api/3.19/auth/signin`;
  try {
    // First authenticate with PAT
    const authResponse = await axios.post(apiUrl, {
      credentials: {
        personalAccessTokenName: patName,
        personalAccessTokenSecret: pat,
        site: {
          contentUrl: ""
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const token = authResponse.data.credentials.token;
    const siteId = authResponse.data.credentials.site.id;

    // Then get users
    const usersResponse = await axios.get(`${serverUrl}/api/3.19/sites/${siteId}/users`, {
      headers: {
        'X-Tableau-Auth': token
      }
    });

    console.log("Tableau API Response:", usersResponse.data);
    return usersResponse.data;
  } catch (error) {
    console.error("Error calling Tableau API:", error.response?.data || error.message);
    throw new Error(`Tableau API Error: ${error.response?.data?.error?.message || error.message}`);
  }
};

function idString(str) {
  // return lowercase with no spaces or special characters
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
} 

module.exports = {
  mainPane,
  addInstance,
  deleteInstance,
  sync,
};