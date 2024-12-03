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
  if(!formData.name || !formData.tenantId || !formData.clientSecret || !formData.clientId) {
    throw new Error('Missing required fields');
  }

  const id = crypto.randomBytes(10).toString('hex');
  const clientSecret = await core.crypto.encrypt(formData.clientSecret);

  const instance = {
    id,
    name: formData.name,
    tenantId: formData.tenantId,
    clientId: formData.clientId,
    clientSecret: clientSecret,
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
    await core.graph.deleteSource(`source:powerbi:${id}`);
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

async function processInstance(instance){
  try {
    console.log('Syncing Instance: ', instance.name);

    const instanceId = instance.id;
    const orgName = instance.name;
    const tenantId = instance.tenantId;
    const clientId = instance.clientId;
    const clientSecret = await core.crypto.decrypt(instance.clientSecret);

    const source = core.source.getSourceObject('powerbi', instanceId, orgName);

    const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
    const response = await callPowerBIAdminAPI(accessToken);

    await core.cache.save(`powerbi-response`, response);

    const personas = [];


    // await core.graph.syncPersonas(personas, source);

    return `Instance synced: ${orgName}`;
  } catch (error) {
    return `Error syncing instance: ${error.message}`;
  }
}

const getAccessToken = async (tenantId, clientId, clientSecret) => {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("scope", "https://analysis.windows.net/powerbi/api/.default");

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    console.log("Access Token Acquired");
    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error.response?.data || error.message);
    throw new Error("Failed to acquire access token.");
  }
};

const callPowerBIAdminAPI = async (accessToken) => {
  const apiUrl = "https://api.powerbi.com/v1.0/myorg/admin/groups?$top=5000";
  // const apiUrl = "https://api.powerbi.com/v1.0/myorg/datasets";
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log("Power BI Admin API Response:", response.data);
    return response;
  } catch (error) {
    console.error("Error calling Power BI Admin API:", error.response?.data || error.message);
    throw new Error(`Power BI API Error: ${error.response?.data?.error?.message || error.message}`);
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