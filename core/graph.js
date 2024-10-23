const {cache} = require('../utils/cache');
const CC = require('./constants');
const check = require('./check');
const connector = require('./graphConnector');

/* Fix: enable automatic pagination

optionalParams.page = optionalParams.page || 1;
const pageSize = optionalParams?.pageSize || 1500;
const orderBy = optionalParams?.orderBy || "upn";
const orderByDirection = optionalParams?.orderByDirection || "ASC";

const skip = neo4j.int((page - 1) * pageSize);
const limit = neo4j.int(pageSize);
const optionalParams = { skip, limit, ...optionalParams};
*/

const defaultPageParams = {
  page: 1,
  pageSize: 1500, 
  orderBy: "upn",
  orderByDirection: "ASC",
}

const defaultAccessLevels = [
  CC.LEVEL.ALIAS,
  CC.LEVEL.ADMIN,
  CC.LEVEL.MANAGE,
  CC.LEVEL.ACT_AS,
]

//
// Public
//

const deleteOrphanedPersonas = async () => { 

}

const deleteSource = async (sourceId, querySetOnly) => {

}

const mergePersonaDeclaration = async (sourceId, personaUpn, confidence, querySetOnly) => {

}

const mergeRelationshipDeclaration = async (relationshipObject, querySetOnly) => {

}

const mergeSource = async (source, querySetOnly) => {
  check.sourceObject(source);

  const query = `MERGE (source:Source {id: $source.id})
  SET source.name = $source.name, source.lastUpdate = $source.lastUpdate
  RETURN source`

  if(querySetOnly) {
    return {
      query,
      values: { source }
    }
  }

  const response = await connector.runRawQuery(query, { source });
  const graphSource = response.records.map(record => {
    return record.get('source').properties;
  });
  if(response.summary.notifications.length > 0) {
    console.log('Notifications:', response.summary.notifications);
  }
  return graphSource[0];
}

// persona property search
/*
filter: {
  props: {
    ids: [],
    upns: [],
    platforms: [],
    types: [],
  }
  obey: {
    levels: [],
    sources: [],
    min-confidence: 0,
    max-confidence: 1,
  }
  control: {
    levels: [],
    sources: [],
    min-confidence: 0,
    max-confidence: 1,
  }
  source: {
    ids: [],
    min-confidence: 0,
    max-confidence: 1,
  }
}

*/
const readFilter = async (filter, pageParams) => {

}

const readOrphanedPersonas = async () => {

}

const readPersonaControl = async (upn, levels, recursive = false, pageParams) => {

}

const readPersonaDeclarations = async (upn) => {

}

const readPersonaObey = async (upn, levels, recursive = false, pageParams) => {

}

const readPersonaProperties = async (upn) => {

}

const readSource = async (sourceId) => {
  const query = `MATCH (source:Source {id: $sourceId})
  RETURN source`

  const response = await connector.runRawQuery(query, { sourceId });

  const source = response.records.map(record => {
    return record.get('source').properties;
  });
  if(response.summary.notifications.length > 0) {
    console.log('Notifications:', response.summary.notifications);
  }
  return source[0];
}

const readSourcePersonas = async (sourceId) => {
  const query = `MATCH (source:Source {id: $sourceId})-[:DECLARE]->(persona:Persona)
  RETURN persona`

  const response = await connector.runRawQuery(query, { sourceId });

  const personas = response.records.map(record => {
    return record.get('persona').properties;
  });
  if(response.summary.notifications.length > 0) {
    console.log('Notifications:', response.summary.notifications);
  }
  return personas;
}

const readSourceRelationships = async (sourceId) => {
  const query = `MATCH (persona:Persona)-[rel:CONTROL]->(relation:Persona)
  WHERE rel.sourceId = $sourceId
  RETURN DISTINCT persona.upn AS controlUpn, relation.upn AS obeyUpn, properties(rel)`

  const response = await connector.runRawQuery(query, { sourceId });

  const relationships = response.records.map(record => {
    const controlUpn = record.get('controlUpn');
    const obeyUpn = record.get('obeyUpn');
    return { controlUpn, obeyUpn, ...record.get('properties(rel)') };
  });
  if(response.summary.notifications.length > 0) {
    console.log('Notifications:', response.summary.notifications);
  }

  return relationships;
}

const removePersonaDeclaration = async (sourceId, personaUpn, querySetOnly) => {

}

const removeRelationshipDeclaration = async (sourceId, controlUpn, obeyUpn, querySetOnly) => {

}

const runRawQuery = connector.runRawQuery;

const runRawQueryArray = connector.runRawQueryArray;

module.exports = {
  deleteOrphanedPersonas,
  deleteSource,
  mergePersonaDeclaration,
  mergeRelationshipDeclaration,
  mergeSource,
  readFilter,
  readOrphanedPersonas,
  readPersonaControl,
  readPersonaDeclarations,
  readPersonaObey,
  readPersonaProperties,
  readSource,
  readSourcePersonas,
  readSourceRelationships,
  removePersonaDeclaration,
  removeRelationshipDeclaration,
  runRawQuery,
  runRawQueryArray,
}