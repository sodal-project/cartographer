const {WebClient} = require('@slack/web-api');
const core = require('../../core/core');

async function sync(instance){
  try {
    const source = {
      sid: `source:slack:${instance.id}`,
      name: instance.name,
      lastUpdate: new Date().toISOString(),
    }

    console.log(`Processing ${instance.name}`);
    const personas = await getInstancePersonas(instance);
    await core.cache.save(`allPersonas-${instance.id}`, personas);

    //
    // update graph from remote store
    //
    await core.graph.syncPersonas(personas, source);

    console.log(`Process Complete for ${instance.name}`);
    
    return `Slack instance synced: ${instance.name}`;
  } catch (error) {
    return `Error syncing Slack instance: ${error.message}`;
  }
}

const getInstancePersonas = async (instance) => {
    //
    // setup team (Slack workspace)
    //
    const token = await core.crypto.decrypt(instance.secret);
    const client = new WebClient(token);
    const teamId = instance.teamId;
    const name = instance.name;
    
    // 
    // load cache with raw data
    // 
    const users = await loadCached(loadUsers, client, teamId);
    const channels = await loadCached(loadChannels, client, teamId);
    const groups = await loadCached(loadUsergroups, client, teamId);
    const logs = await loadCached(loadUserAccessLogs, client, teamId);

    const teamRaw = await loadCached(loadTeam, client, teamId, teamId);
    const teams = [teamRaw];

    // load channel member data
    const channelMembers = [];
    const channelMembersUniqueIds = {};
    for(const channel of channels){
      const members = await loadCached(loadChannelMembers, client, teamId, channel.id);
      for(const member of members){
        channelMembers.push({
          channel: channel.id,
          member: member,
        })
        channelMembersUniqueIds[member] = true;
      }
    }

    // load unique foreign channel member account data
    const usersUniqueIds = [...new Set(users.map(user => user.id))];
    const missingChannelMembers = Object.keys(channelMembersUniqueIds).filter(id => !usersUniqueIds.includes(id));

    const channelMemberTeamIds = {};
    channelMemberTeamIds[teamId] = true;

    for(const id of missingChannelMembers){
      const user = await loadCached(loadUser, client, teamId, id);
      if(user) { 
        users.push(user);
        channelMemberTeamIds[user.team_id] = true;
      }
    }

    // load slack team data
    for(const teamId of Object.keys(channelMemberTeamIds)){
      if(teamId) {
        const team = await loadCached(loadTeam, client, teamId, teamId);
        teams.push(team);
      }
    }

    // 
    // generate personas
    // 
    const userPersonas = mapUserPersonas(users, teamId);
    const channelPersonas = mapChannelPersonas(channels, teamId, name);
    const groupPersonas = mapUsergroupPersonas(groups, teamId);
    const teamPersonas = mapTeamPersonas(teams);
    const userPersonaLastAccess = mapUserPersonaLastAccess(logs);
    const channelMemberPersonas = mapChannelMemberPersonas(channelMembers, teamId);

    const allPersonas = userPersonas.concat(channelPersonas).concat(groupPersonas).concat(teamPersonas).concat(userPersonaLastAccess).concat(channelMemberPersonas);

    return allPersonas;
}

//
// Persona Mapping Functions
//

const mapTeamPersonas = (teams) => {
  const personas = [];
  for(const team of teams){
    const persona = {
      upn: `upn:slack:team:${team.id}`,
      id: team.id,
      platform: "slack",
      type: "team",
      name: team.name,
      domain: team.domain,
      emailDomain: team.email_domain,
      isVerified: team.is_verified,
      teamUrl: team.url,
      publicUrl: team.public_url
    }
    personas.push(persona);
  }
  return personas;
}

const mapUserPersonas = (users, slackTeamId) => {

  const personas = [];
  const slackTeamUpn = getTeamUpn(slackTeamId);

  for(const user of users){
    const levelMap = {
      "owner": core.constants.LEVEL["ADMIN"],
      "admin": core.constants.LEVEL["MANAGE"],
      "member": core.constants.LEVEL["ACT_AS"],
      "multi-channel-guest": core.constants.LEVEL["ACCESS"],
      "single-channel-guest": core.constants.LEVEL["ACCESS"],
    }

    const currentTeamUpn = getTeamUpn(user.team_id);
    let confidence = core.constants.CONFIDENCE["HIGH-PROVEN"];
    if(currentTeamUpn != slackTeamUpn){
      confidence = core.constants.CONFIDENCE["LOW-INFERRED"];
    }

    let levelCustom;
    if(user.is_owner){
      levelCustom = "owner";
    } else if(user.is_admin){
      levelCustom = "admin";
    } else if(user.is_restricted) {
      levelCustom = "multi-channel-guest";
    } else if(user.is_ultra_restricted){
      levelCustom = "single-channel-guest";
    } else {
      levelCustom = "member";
    }

    const handle = user.profile.display_name || user.profile.real_name || user.name;

    const status = user.deleted ? "suspended" : "active";

    const persona = {
      upn: "upn:slack:account:" + user.id,
      id: user.id,
      platform: "slack",
      type: "account",
      name: `${handle}`,
      handle: handle,
      name: user.name,
      realName: user.profile.real_name,
      displayName: user.profile.display_name,
      team: user.team_id,
      accountType: user.is_bot ? "bot" : "user",
      status: status,
      email: user.profile.email,
      control: [
        {
          upn: currentTeamUpn,
          level: levelMap[levelCustom],
          levelCustom: levelCustom,
          confidence: confidence,
        }
      ],
      obey: [
        {
          upn: currentTeamUpn,
          level: core.constants.LEVEL["REALIZE"],
          confidence: confidence,
        }
      ]
    }
    personas.push(persona);

    const email = user.profile.email?.toLowerCase();
    if(email && status == "active") {
      const authPersona = {
        upn: "upn:slack:account:" + email,
        id: email,
        platform: "slack",
        type: "account",
        control: [
          {
            upn: "upn:slack:account:" + user.id,
            level: core.constants.LEVEL["ADMIN"],
            confidence: core.constants.CONFIDENCE["MAX-SYSTEM"],
          }
        ], 
        obey: [
          {
            upn: "upn:email:account:" + email.toLowerCase(),
            level: core.constants.LEVEL["ADMIN"],
            confidence: core.constants.CONFIDENCE["MAX-SYSTEM"],
          }
        ]
      }
      personas.push(authPersona);
    }
  }
  return personas;
}

const mapUserPersonaLastAccess = (logs) => {
  const users = {};

  for(const log of logs){
    if(!users[log.user_id]){
      users[log.user_id] = {
        accessCounter: 1,
        lastActive: log.date_last
      }
    } else {
      users[log.user_id].accessCounter++;
    }
  }

  const userIdKeys = Object.keys(users);

  const personas = [];
  for(const key of userIdKeys) {
    const user = {
      upn: "upn:slack:account:" + key,
      id: key,
      platform: "slack",
      type: "account",
    }
    user.lastActive = users[key].lastActive;
    user.accessCounter = users[key].accessCounter;
    personas.push(user);
  }
  return personas;
}

const mapChannelPersonas = (channels, slackTeamId, slackTeamName) => {

  const channelPersonas = [];
  const slackTeamUpn = getTeamUpn(slackTeamId);

  for(const channel of channels) {

    let hostTeamUpn = slackTeamUpn;
    if(channel.conversation_host_id) {
      hostTeamUpn = getTeamUpn(channel.conversation_host_id);
    }

    const channelPersona = {
      upn: "upn:slack:channel:" + channel.id,
      id: channel.id,
      platform: "slack",
      type: "channel",
      name: `${channel.name} (${slackTeamName})`,
      channelName: channel.name,
      visibility: channel.is_private ? "private" : "public",
      connect: channel.is_shared ? "shared" : "unshared",
      topic: channel.topic.value,
      purpose: channel.purpose.value,
      obey: [
        {
          upn: hostTeamUpn,
          level: core.constants.LEVEL["REALIZE"],
          confidence: core.constants.CONFIDENCE["MAX-SYSTEM"],
        }
      ]
    }
    channelPersonas.push(channelPersona);
  }
  return channelPersonas;
}

const mapChannelMemberPersonas = (members, slackTeamId) => {

  const slackTeamUpn = getTeamUpn(slackTeamId);

  const personas = [];

  for(const member of members) {
    const memberId = member.member;
    const channelId = member.channel;

    const persona = {
      id: memberId,
      platform: "slack",
      type: "account",
      upn: "upn:slack:account:" + memberId,
      control: [
        {
          upn: "upn:slack:channel:" + channelId,
          level: core.constants.LEVEL["ACT_AS"],
          levelCustom: "member",
          confidence: core.constants.CONFIDENCE["HIGH-PROVEN"],
        }
      ]
    }
    personas.push(persona);
  }
  return personas;
}

const mapUsergroupPersonas = (groups, slackTeamId) => {

  const slackTeamUpn = getTeamUpn(slackTeamId);
  const groupPersonas = [];

  for(const group of groups) {

    const persona = {
      upn: "upn:slack:group:" + group.id,
      id: group.id,
      status: "active",
      platform: "slack",
      type: "group",
      name: `${group.name} (@${group.handle})`,
      groupName: group.name,
      description: group.description,
      handle: group.handle,
      obey: [
        {
          upn: slackTeamUpn,
          level: core.constants.LEVEL["REALIZE"],
          confidence: core.constants.CONFIDENCE["MAX-SYSTEM"],
        }
      ],
      control: []
    }

    const members = group.users;
    const allChannels = group.prefs.channels.concat(group.prefs.groups);

    const memberRelationships = [];
    const channelRelationships = [];

    for(const member of members) {
      const memberupn = "upn:slack:account:" + member;
      const memberRelationship = {
        upn: memberupn,
        level: core.constants.LEVEL["ACT_AS"],
        levelCustom: "member",
        confidence: core.constants.CONFIDENCE["MAX-SYSTEM"],
      }
      memberRelationships.push(memberRelationship);
    }

    for(const channel of allChannels) {
      const channelupn = "upn:slack:channel:" + channel;
      const channelRelationship = {
        upn: channelupn,
        level: core.constants.LEVEL["ACT_AS"],
        levelCustom: "member",
        confidence: core.constants.CONFIDENCE["MAX-SYSTEM"],
      }
      channelRelationships.push(channelRelationship);
    }

    persona.control = persona.control.concat(channelRelationships);
    persona.obey = persona.obey.concat(memberRelationships);

    groupPersonas.push(persona);
  }
  return groupPersonas;
}

//
// API Calls
//

const loadCached = async (func, client, teamId, itemId) => {

  let cacheName = 'slack-' + teamId + "-" + func.name;
  if(itemId) {
    cacheName += "-" + itemId;
  }

  const cacheElements = await core.cache.load(cacheName);
  let elements = [];
  
  if(cacheElements){
    // console.log(`Loading from cache for ${cacheName}`)
    elements = cacheElements;
  } else {
    console.log(`Calling remote API for ${cacheName}`)
    elements = await func(client, itemId);
    await core.cache.save(cacheName, elements);
  }
  return elements;
}

const loadTeam = async (client, itemId) => {

  // enable loading alternate team info
  const requestOptions = { team: itemId };

  const response = await client.team.info(requestOptions);
  if(!response.ok){
    throw new Error("Error loading team info from Slack API");
  }
  return response.team;
}

const loadUser = async (client, itemId) => {
  const response = await client.users.info({user: itemId});
  if(!response.ok){
    throw new Error(`Error loading user ${itemId} info from Slack API`);
  }
  return response.user;
}

const loadUsers = async (client, itemId) => {
  let cursor = "";
  let users = [];
  const requestOptions = {
    // deleted: false,
    limit: 500,
  }
  
  do {
    const response = await client.users.list(requestOptions);
    if(!response.ok){
      throw new Error("Error loading users from Slack API");
    }
    cursor = response.response_metadata ? response.response_metadata.next_cursor : "";
    requestOptions.cursor = cursor;
    users = users.concat(response.members)
  } while (cursor != "");

  return users;
}

const loadUserAccessLogs = async (client) => {
  const callIterations = 100;

  let cursor = "";
  let count = 0;
  let logs = [];
  const requestOptions = {
    limit: 1000,
  }
  
  do {
    const response = await client.team.accessLogs(requestOptions);
    if(!response.ok){
      throw new Error("Error loading access logs from Slack API");
    }
    cursor = response.response_metadata ? response.response_metadata.next_cursor : "";
    requestOptions.cursor = cursor;
    console.log(`Loading access logs, count ${count}`);
    logs = logs.concat(response.logins)
    count++;
    if(count >= callIterations){ break; }
  } while (cursor != "");

  return logs;
}

const loadChannels = async (client, itemId) => {
  let cursor = "";
  let conversations = [];
  const requestOptions = {
    deleted: false,
    limit: 500,
    types: "public_channel,private_channel",
    exclude_archived: true,
  }

  do {
    const response = await client.conversations.list(requestOptions);
    if(!response.ok){
      throw new Error("Error loading conversations from Slack API");
    }
    cursor = response.response_metadata ? response.response_metadata.next_cursor : "";
    requestOptions.cursor = cursor;
    conversations = conversations.concat(response.channels)
  } while (cursor != "");

  return conversations;
}

const loadChannelMembers = async (client, itemId) => {
  let cursor = "";
  let members = [];
  const requestOptions = {
    limit: 500,
    channel: itemId,
  }

  do {
    const response = await client.conversations.members(requestOptions);
    if(!response.ok){
      throw new Error(`Error loading members for ${itemId} from Slack API`);
    }
    cursor = response.response_metadata ? response.response_metadata.next_cursor : "";
    requestOptions.cursor = cursor;
    members = members.concat(response.members)
  } while (cursor != "");

  return members;
}

const loadUsergroups = async (client, itemId) => {  
  const response = await client.usergroups.list({
    limit: 500,
    include_users: true,
    include_disabled: false,
  });

  return response.usergroups;
}

//
// Utility Functions
//

const getTeamUpn = (teamId) => {
  return `upn:slack:team:${teamId}`;
}

module.exports = {
  sync,
}