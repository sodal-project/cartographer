const core = require('../../core/core.js');
const { google } = require('googleapis');

const sync = async (instance) => {
  console.log('Syncing Google instance:', instance.name);

  // Extract the instance properties
  const instanceId = instance.id
  const name = instance.name
  const subjectEmail = instance.subjectEmail
  const customerId = instance.customerId
  const encryptedFile = instance.encryptedFile
  const rawFile = await core.crypto.decrypt(encryptedFile);
  const jsonFile = JSON.parse(rawFile);

  // Create a new Google API client
  const auth = new google.auth.JWT({
    key: jsonFile.private_key,
    email: jsonFile.client_email,
    subject: subjectEmail,
    scopes:[
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.directory.domain.readonly',
      'https://www.googleapis.com/auth/admin.directory.group.readonly',
      'https://www.googleapis.com/auth/admin.directory.user.security'
    ]
  });
  const client = google.admin({ version: 'directory_v1', auth });


  const users = await loadCached(loadUsers, client, instanceId, customerId);
  const groups = await loadCached(loadGroups, client, instanceId, customerId);
  // const groupMembers = groups.map(async (group) => {
  //   return {
  //     members: await loadCached(loadGroupMembers, client, instanceId, customerId, group.id),
  //     id: group.id
  //   }
  // });
  // const userTokens = users.map(async (user) => {
  //   return {
  //     tokens: await loadCached(loadAuthTokens, client, instanceId, customerId, user.id),
  //     id: user.id
  //   }
  // });

}

//
// Map imported API data to persona object arrays
//

const mapOrganizationPersonas = (orgs) => {

}

const mapUserPersonas = (users) => {

}

const mapGroupPersonas = (groups) => {

}

const mapGroupMemberPersonas = (groupMemberSet) => {

}

const mapAuthTokenPersonas = (authTokenSet) => {

}

//
// Get data from the remote API
// 

const loadCached = async(func, client, instanceId, customerId, itemId) => {
  const cacheName = `google-${instanceId}-${customerId}-${func.name}` + (itemId ? `-${itemId}` : '');
  const cache = await core.cache.load(cacheName);

  if(cache) {
    return cache;
  } else {
    const data = await func(client, customerId, itemId);
    await core.cache.save(cacheName, data);
    return data;
  }
}

const loadUsers = async (client, customerId, itemId) => {
  const responses = await apiCall(client, "users", "list", {
    customer: customerId,
    maxResults: 500,
  })
  return responses.map(response => response.data.users).flat();
}

const loadGroups = async (client, customerId, itemId) => {
  const responses = await apiCall(client, "groups", "list", {
    customer: customerId,
    maxResults: 500,
  })
  return responses.map(response => response.data.groups).flat();
}

const loadGroupMembers = async (client, customerId, itemId) => {
  const responses = await apiCall(client, "members", "list", {
    customer: customerId,
    maxResults: 500,
    groupKey: itemId,
  })
  return responses.map(response => response.data.members).flat();
}

const loadAuthTokens = async (client, customerId, itemId) => {
  const responses = await apiCall(client, "tokens", "list", {
    customer: customerId,
    maxResults: 500,
    userKey: itemId,
  })
  return responses.map(response => response.data.items).flat();
}

const apiCall = async (client, path, call, request) => {
  let pageToken;
  const responses = [];

  do {
    const response = await client[path][call](request);
    responses.push(response);
    pageToken = response.data.nextPageToken;
  } while(pageToken);

  return responses;
}

module.exports = {
  sync
}
