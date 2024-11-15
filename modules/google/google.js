const core = require('../../core/core.js');
const { google } = require('googleapis');
const LEVEL = core.constants.LEVEL;

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

  // Get raw data for this instance
  const workspaces = [{
    id: customerId,
    name: name,
  }]
  const users = await loadCached(loadUsers, client, instanceId, customerId);
  const groups = await loadCached(loadGroups, client, instanceId, customerId);
  const groupMembers = await Promise.all(groups.map(async (group) => {
    return {
      members: await loadCached(loadGroupMembers, client, instanceId, customerId, group.id),
      id: group.id
    }
  }));
  const userTokens = await Promise.all(users.map(async (user) => {
    return await loadCached(loadAuthTokens, client, instanceId, customerId, user.id)
  }));

  // Map the data to persona objects
  let personas = [];
  personas = personas.concat(mapWorkspacePersonas(workspaces));
  personas = personas.concat(mapUserPersonas(users, customerId));

  await core.cache.save(`allPersonas-${instanceId}`, personas);
  // Save the personas to the graph
  // await core.graph.syncPersonas(personas);

}

//
// Map imported API data to persona object arrays
//

const mapWorkspacePersonas = (workspaces) => {
  return workspaces.map(workspace => {
    const newWorkspace = {
      upn: getWorkspaceUpn(workspace.id),
      id: workspace.id,
      platform: 'google',
      type: 'workspace',
      friendlyName: workspace.name,
    }
    core.check.personaObject(newWorkspace);
    return newWorkspace;
  })
}

const mapUserPersonas = (users, customerId) => {
  if(!users) { return [] }
  if(!customerId) { throw new Error('customerId is required') }

  const workspaceUpn = getWorkspaceUpn(customerId);

  let personas = [];

  const levelMap = {
    "superAdmin": LEVEL["ADMIN"],
    "delegatedAdmin": LEVEL["MANAGE"],
    "member": LEVEL["ACT_AS"],
  }

  users.forEach(user => {
    const firstName = user.name?.givenName
    const lastName = user.name?.familyName
    const level = user.isAdmin ? 'superAdmin' : user.isDelegatedAdmin ? 'delegatedAdmin' : 'member';

    const newUser = {
      upn: `upn:google:account:${user.id}`,
      id: user.id,
      platform: 'google',
      type: 'account',
      friendlyName: user.name.fullName,
      firstName: firstName,
      lastName: lastName,
      authenticationMin: user.isEnrolledIn2Sv ? 2: 1,
      lastLogin: user.lastLoginTime,
      primaryEmail: user.primaryEmail,
      orgUnitPath: user.orgUnitPath,
      suspended: user.suspended,
      archived: user.archived,
      control: [],
      obey: [],
    }

    newUser.obey.push({
      upn: workspaceUpn,
      level: LEVEL["REALIZE"],
      confidence: 1
    })

    if(!user.suspended && !user.archived) {

      // Add the workspace control relationship
      newUser.control.push({
        upn: workspaceUpn,
        level: levelMap[level],
        confidence: 1
      })

      let allAliases = [user.primaryEmail]
      if(user.aliases) { allAliases = allAliases.concat(user.aliases) }
      if(user.nonEditableAliases) { allAliases = allAliases.concat(user.nonEditableAliases) }

      // Add email aliases
      allAliases.forEach(email => {
        const rel = {
          upn: `upn:email:account:${email}`,
          level: LEVEL["ALIAS"],
          confidence: 1
        }
        newUser.control.push(rel);
        newUser.obey.push(rel);
      })
    }
    core.check.personaObject(newUser);
    personas.push(newUser);
  });

  return personas;
}

const mapGroupPersonas = (groups, customerId) => {

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

//
// Helper Functions
//
const getWorkspaceUpn = (customerId) => {
  return `upn:google:workspace:${customerId}`;
}

module.exports = {
  sync
}
