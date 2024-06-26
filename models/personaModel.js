const { database } = require('../utils/database.js');
const personaQueryBuilder = require('../utils/personaQueryBuilder.js');
const discoveryRunner = require('../utils/discoveryRunner.js');

const allRelationships = [
  "read",
  "guest",
  "user",
  "admin",
  "superadmin",
  "system",
]

const getPersona = async (personaUpn) => {
  const query = `MATCH (p)
  WHERE p.upn="${personaUpn}"
  RETURN DISTINCT p
  LIMIT 1`;
  const result = await database.dbQuery(query);
  const persona = result.records[0].get('p').properties;
  return persona;
}

const linkPersonas = async (data) => {
  const query = `
    MATCH (node1:Persona {upn: '${data.participantUpn}'}), (node2:Persona {upn: '${data.personaUpn}'})
    MERGE (node1)-[:SUPERADMIN_CONTROL]->(node2)
  `;
  const result = await database.dbCreate(query, data)
  return result;
}

const unlinkPersonas = async (data) => {
  const query = `
    MATCH (node1:Persona {upn: '${data.participantUpn}'})-[r:SUPERADMIN_CONTROL]->(node2:Persona {upn: '${data.personaUpn}'})
    DELETE r;
  `;
  const result = await database.dbCreate(query, data)
  return result;
}

const addPersona = async (data) => {
  const query = `
    CREATE (p:Persona {
      id: $id,
      upn: $upn,
      type: $type,
      platform: $platform,
      status: $status,
      friendlyName: $friendlyName,
      handle: $handle,
      firstName: $firstName,
      lastName: $lastName
    })
    RETURN p
  `;
  const result = await database.dbCreate(query, data)
  return result;
};

/**
 * params
 * @param {Number} page 
 * @param {Number} pageSize 
 * @param {Object} query 
 * @returns [{Object}] personas
 */
const getPersonas = async (page, pageSize, filterQueryObject = [], orderBy, orderByDirection) => {
  const result = await discoveryRunner.runQueryArray(filterQueryObject, page, pageSize, orderBy, orderByDirection);
  return result;
}

const getPersonaAgents = async (personaUpn, orderBy = "id", orderByDirection = "ASC") => {
  console.log('getPersonaAgents', personaUpn, orderBy, orderByDirection)
  const query = `
    MATCH (p)-[:ALIAS_OF|HAS_ALIAS *0..2]->(agent)
    WHERE p.upn="${personaUpn}"
    RETURN DISTINCT agent
    ORDER BY agent.${orderBy} ${orderByDirection}`;
  const result = await database.dbQuery(query);
  const personas = result.records.map(node => node._fields[0].properties);
  return personas;
};

const getAgentsControl = async (personaUpn, orderBy="id", orderByDirection="ASC") => {
  const relationshipString = personaQueryBuilder.getControlMatchString(allRelationships);
  const query = `MATCH (p)-[:ALIAS_OF|HAS_ALIAS *0..2]->(agent)-[rel${relationshipString}]->(controls)
  WHERE p.upn="${personaUpn}"
  RETURN DISTINCT controls, rel
  ORDER BY controls.${orderBy} ${orderByDirection}`;
  const result = await database.dbQuery(query);
  const properties = result.records.map(node => node._fields[0].properties);
  const relationships = result.records.map(node => node._fields[1].type);
  const personas = properties.map((item, index) => ({
    ...item,
    access: relationships[index],
  }));
  return personas;
};

const getAgentsObey = async (personaUpn, orderBy="id", orderByDirection="ASC") => {
  const relationshipString = personaQueryBuilder.getControlMatchString(allRelationships);
  const query = `MATCH (p)-[:ALIAS_OF|HAS_ALIAS *0..2]->(agent)<-[rel${relationshipString}]-(obey)
  WHERE p.upn="${personaUpn}"
  RETURN DISTINCT obey, rel
  ORDER BY obey.${orderBy} ${orderByDirection}`;
  const result = await database.dbQuery(query);
  const properties = result.records.map(node => node._fields[0].properties);
  const relationships = result.records.map(node => node._fields[1].type);
  const personas = properties.map((item, index) => ({
    ...item,
    access: relationships[index],
  }));
  return personas;
};

const deletePersona = async (upn) => {
  const query = `
    MATCH (n { upn: '${upn}' })
    DETACH DELETE n;
  `;
  const result = await database.dbDelete(query)
  return result;
}

const getRelationships = async () => {
  const query = `
    MATCH (p)-[r]->(end)
    WHERE p.type = "participant"
    RETURN p.upn, r, end.upn
  `;
  const result = await database.dbQuery(query);
  return result;
}

const updatePersonaProperty = async (data) => {
  const query = `
    MERGE (p:Persona {upn: $upn})
    SET p.${data.fieldLabel} = $fieldValue
    RETURN p
  `;
  const result = await database.dbCreate(query, data)
  return result;
};

const deletePersonaProperty = async (data) => {
  const query = `
    MERGE (p:Persona {upn: $upn})
    REMOVE p.${data.fieldLabel}
    RETURN p
  `;
  const result = await database.dbCreate(query, data)
  return result;
};

const updateParticipant = async (data) => {
  const query = `
    MERGE (p:Persona {upn: $upn})
    SET p.friendlyName = $friendlyName
    SET p.firstName = $firstName
    SET p.lastName = $lastName
    SET p.handle = $handle
    RETURN p
  `;
  const result = await database.dbCreate(query, data)
  return result;
};

module.exports = {
  getPersona,
  addPersona,
  deletePersona,
  linkPersonas,
  unlinkPersonas,
  getPersonas,
  getPersonaAgents,
  getAgentsControl,
  getAgentsObey,
  getRelationships,
  updatePersonaProperty,
  deletePersonaProperty,
  updateParticipant,
}