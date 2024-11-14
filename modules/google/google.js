const core = require('../../core/core.js');
const { google } = require('googleapis');

const sync = async (instance) => {
  console.log('Syncing Google instance:', instance.name);

  // Extract the instance properties
  const id = instance.id
  const name = instance.name
  const subjectEmail = instance.subjectEmail
  const customerId = instance.customerId
  const encryptedFile = instance.encryptedFile
  const jsonFile = await core.crypto.decrypt(encryptedFile);

  // Create a new Google API client
  const auth = new google.auth.JWT({
    key: jsonFile,
    subject: subjectEmail,
    scopes:[
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.directory.domain.readonly',
      'https://www.googleapis.com/auth/admin.directory.group.readonly',
      'https://www.googleapis.com/auth/admin.directory.user.security'
    ]
  });
  const client = google.admin({ version: 'directory_v1', auth });

  /* Create a single object that will hold all raw data arrays

    This simplifies capturing data from API calls that may inform
    one or more persona object types. Each array will be processed
    into persona objects later.
  */
  const rawArrays = {
    orgs: [],
    users: [],
    groups: [],
    groupMembers: [],
    authTokens: [],
  }
}

//
// Persona Mapping Functions
//
const mapOrganizationPersonas = (orgs) => {

}

const mapUserPersonas = (users) => {

}

const mapGroupPersonas = (groups) => {

}

const mapGroupMemberPersonas = (groupMembers) => {

}

const mapAuthTokenPersonas = (authTokens) => {

}

//
// API Calls
// 

const loadCached = async(func, client, sourceId, itemId) => {
  const cacheName = `google-${sourceId}-${func.name}` + (itemId ? `-${itemId}` : '');


  const cache = await core.cache.readCache(`google-${sourceId}-${itemId}`);
  if(itemId){
    cache
  }
  if(cache) {
    return cache;
  } else {
    const data = await func(client, orgId, itemId);
    await core.cache.writeCache(`${func.name}:${orgId}:${itemId}`, data);
    return data;
  }
}


module.exports = {
  sync
}
