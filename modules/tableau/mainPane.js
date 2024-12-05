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

  const rawInstances = data.instances || {};

  const instances = Object.values(rawInstances).map(instance => ({
    columns: [
      instance.id,
      instance.name,
      instance.serverUrl,
      instance.patName,
      instance.ready ? 'Ready' : 'Processing'
    ],
    actions: true,
    ready: instance.ready,
    id: instance.id  // for action forms
  }));
  data.instances = instances;

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

    const endpoint = 'users';
    const userResponse = await callTableauAPI(serverUrl, endpoint, pat, patName);
    await core.cache.save(`tableau-response-${endpoint}`, userResponse);

    const personas = [];
    // Process users here...

    return `Instance synced: ${orgName}`;
  } catch (error) {
    return `Error syncing instance: ${error.message}`;
  }
}

function mapSitePersona(siteName) {

}

function mapUserPersonas(userResponse) {
  const users = userResponse.users.user;
  const personas = [];

  const siteRoleAccessMap = {
    'ServerAdministrator': 'admin',
    'SiteAdministrator': 'admin',
    'SiteAdministratorCreator': 'admin',
    'SiteAdministratorExplorer': 'manage',
    'SiteCreator': 'act_as',
    'Explorer': 'act_as',
    'Publisher': 'act_as',
    'Creator': 'act_as',
    'Interactor': 'access',
    'Viewer': 'access',
    'ReadOnly': 'access',
    'Unlicensed': null,
  }

  for(const user of users) {
    const persona = {
      platform: 'tableau',
      type: 'account',
      id: user.id,
      name: user.name,
      fullName: user.fullName,
      externalAuthUserId: user.externalAuthUserId,
      lastLogin: user.lastLogin,
      authSetting: user.authSetting,
    }

    const access = siteRoleAccessMap[user.siteRole];
    if(access) {
      
    }
  }
}

const callTableauAPI = async (serverUrl, endpoint, pat, patName) => {
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
    const response = await axios.get(`${serverUrl}/api/3.19/sites/${siteId}/${endpoint}`, {
      headers: {
        'X-Tableau-Auth': token
      }
    });
    return response.data;

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