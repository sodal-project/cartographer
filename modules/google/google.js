const core = require('../../core/core.js');
const { google } = require('googleapis');
const tokenMap = require('./googleTokens.js');
const LEVEL = core.constants.LEVEL;

const sync = async (instance) => {
  console.log('Syncing Google instance:', instance.name);

  // Extract the instance properties
  const instanceId = instance.id
  const name = instance.name
  const source = core.source.getSourceObject('google', instanceId, name);

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
  const groupMemberSets = await Promise.all(groups.map(async (group) => {
    return {
      members: await loadCached(loadGroupMembers, client, instanceId, customerId, group.id),
      id: group.id
    }
  }));

  const userTokens = await Promise.all(users.map(async (user) => {
    const userTokens = await loadCached(loadAuthTokens, client, instanceId, customerId, user.id);
    return {
      userTokens: userTokens,
      userEmail: user.primaryEmail,
      userId: user.id,
    }
  }));

  // Map the data to persona objects
  let personas = [];
  personas = personas.concat(mapWorkspacePersonas(workspaces));
  personas = personas.concat(mapUserPersonas(users, customerId));
  personas = personas.concat(mapGroupPersonas(groups, customerId));
  personas = personas.concat(mapGroupMemberPersonas(groupMemberSets));
  personas = personas.concat(mapAuthTokenPersonas(userTokens));

  await core.cache.save(`allPersonas-${instanceId}`, personas);
  // Save the personas to the graph
  await core.graph.syncPersonas(personas, source);
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

    // stop processing if the user is suspended or archived
    if(user.suspended || user.archived) {
      personas.push(newUser);
      return;
    }

    // Add the workspace control relationship
    newUser.control.push({
      upn: workspaceUpn,
      level: levelMap[level],
      confidence: 1
    })

    // Add email aliases
    let allAliases = user.primaryEmail ? [user.primaryEmail] : [];
    if(user.aliases) { allAliases = allAliases.concat(user.aliases) }
    if(user.nonEditableAliases) { allAliases = allAliases.concat(user.nonEditableAliases) }

    allAliases.forEach(email => {
      const rel = {
        upn: `upn:email:account:${email}`,
        level: LEVEL["ALIAS"],
        confidence: 1
      }
      newUser.control.push(rel);
      newUser.obey.push(rel);
    })
    personas.push(newUser);
  });

  return personas;
}

const mapGroupPersonas = (groups, customerId) => {
  if(!groups) { return [] }
  if(!customerId) { throw new Error('customerId is required') }

  const workspaceUpn = getWorkspaceUpn(customerId);

  let personas = [];

  groups.forEach(group => {
    const newGroup = {
      upn: `upn:google:group:${group.id}`,
      id: group.id,
      platform: 'google',
      type: 'group',
      friendlyName: `${group.name} (${group.email})`,
      name: group.name,
      email: group.email,
      description: group.description,
      adminCreated: group.adminCreated,
      kind: group.kind,
      control: [],
      obey: [],
    }

    newGroup.obey.push({
      upn: workspaceUpn,
      level: LEVEL["REALIZE"],
      confidence: 1
    })

    newGroup.control.push({
      upn: workspaceUpn,
      level: LEVEL["ACT_AS"],
      confidence: 1
    })

    let allAliases = group.email ? [group.email] : [];
    if(group.aliases) { allAliases = allAliases.concat(group.aliases) }

    allAliases.forEach(email => {
      const rel = {
        upn: `upn:email:account:${email}`,
        level: LEVEL["ALIAS"],
        confidence: 1
      }
      newGroup.control.push(rel);
      newGroup.obey.push(rel);
    });

    personas.push(newGroup);
  });

  return personas;
}

const mapGroupMemberPersonas = (groupMemberSets) => {
  if(!groupMemberSets) { return [] }

  let personas = [];

  const levelMap = {
    "OWNER": LEVEL["ADMIN"],
    "MANAGER": LEVEL["MANAGE"],
    "MEMBER": LEVEL["ACT_AS"],
  }

  const typeMap = {
    "USER": "account",
    "GROUP": "group",
    "CUSTOMER": "workspace",
  }

  groupMemberSets.forEach(set => {
    const groupId = set.id;
    if(!groupId) { throw new Error('groupId is required') }

    const groupUpn = `upn:google:group:${groupId}`;

    set.members.forEach(member => {
      const type = typeMap[member.type];

      const newMember = {
        upn: `upn:google:${type}:${member.id}`,
        id: member.id,
        platform: 'google',
        type: type,
        control: [],
        obey: [],
      }
  
      if(member.status !== 'SUSPENDED') {
        newMember.control.push({
          upn: groupUpn,
          level: levelMap[member.role],
          role: member.role,
          confidence: 1
        })
        
        if(member.email) {
          const alias = {
            upn: `upn:email:account:${member.email}`,
            level: LEVEL["ALIAS"],
            confidence: 1
          }
          newMember.control.push(alias);
          newMember.obey.push(alias);
        }
      }
      personas.push(newMember);
    }); // end groupMembers.forEach
  }) // end groupMemberSets.forEach

  return personas;
}

const mapAuthTokenPersonas = (authTokenSets) => {
  if(!authTokenSets) { return [] }

  let personas = [];

  authTokenSets.forEach(set => {
    const email = set.userEmail;
    const userId = set.userId;
    const tokens = set.userTokens;

    tokens.forEach(token => {
      const name = token.displayText;
      const platform = tokenMap[name];
      if(!platform) { 
        console.log(`No platform found for token: ${name}`);
        return; 
      }

      const newToken = {
        upn: `upn:${platform}:account:${email}`,
        id: email,
        platform: platform,
        type: 'account',
        googleTokenClientId: token.clientId,
        control: [],
        obey: [],
      }

      newToken.obey.push({
        upn: `upn:google:account:${userId}`,
        level: LEVEL["ADMIN"],
        confidence: 1
      });
      personas.push(newToken);
    });
  });

  return personas;
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
