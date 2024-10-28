const check = require('./check');
const { log } = require('./core');
const connector = require('./graphConnector');

/* TODO: enable pagination

optionalParams.page = optionalParams.page || 1;
const pageSize = optionalParams?.pageSize || 1500;
const orderBy = optionalParams?.orderBy || "upn";
const orderByDirection = optionalParams?.orderByDirection || "ASC";

const skip = neo4j.int((page - 1) * pageSize);
const limit = neo4j.int(pageSize);
const optionalParams = { skip, limit, ...optionalParams};

const defaultPageParams = {
  page: 1,
  pageSize: 1500, 
  orderBy: "upn",
  orderByDirection: "ASC",
}

*/

// TODO: Implement deleteOrphanedPersonas
const deleteOrphanedPersonas = async () => { 

}

/**
 * Delete a source form the persona graph database
 * 
 * @param {string} sourceId 
 * @param {boolean} querySetOnly - if true, return a query set object instead of executing the query
 * @returns {object} - The response from the database, or the query set object
 */
const deleteSource = async (sourceId, querySetOnly) => {
  const queries = [];
  queries.push({
    query: `MATCH (source:Source {id: $sourceId})
    DETACH DELETE source`,
    values: { sourceId }
  })
  queries.push({
    query: `MATCH ()-[r:CONTROL]-() WHERE r.sourceId = $sourceId DELETE r`,
    values: { sourceId }
  })

  if(querySetOnly) {
    return queries;
  }

  const response = await connector.runRawQueryArray(queries);

  console.log('Deleted source:', sourceId);
  return response
}

// TODO: Implement mergePersonaDeclaration
const mergePersonaDeclaration = async (sourceId, personaUpn, confidence, querySetOnly) => {

}

// TODO: Implement mergeRelationshipDeclaration
const mergeRelationshipDeclaration = async (relationshipObject, querySetOnly) => {

}

/**
 * Merge a source with the persona graph database
 * 
 * @param {object} source - a valid source object
 * @param {boolean} querySetOnly - if true, return a query set object instead of executing the query
 * @returns {object} - The source object from the database, or the query set object
 */
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

  return graphSource[0];
}

// TODO: persona filter list query
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

/**
 * Read all personas that are not declared by any source
 * 
 * @returns {object[]} - An array of persona objects
 */ 
const readOrphanedPersonas = async () => {
  const query = `MATCH (persona:Persona)
  WHERE NOT ()-[:DECLARE]->(persona)
  RETURN persona`

  const response = await connector.runRawQuery(query);

  const personas = response.records.map(record => {
    return record.get('persona').properties;
  });

  return personas;
}

/**
 * Get all personas that a given person directly controls
 * 
 * @param {string} upn 
 * @param {number[]} levels 
 * @returns {object[]} - An array of persona objects
 */
const readPersonaControl = async (upn, levels) => {
  const query = `MATCH (persona:Persona {upn: $upn})-[rel:CONTROL]->(relation:Persona)
  WHERE rel.level IN $levels
  RETURN relation`

  const response = await connector.runRawQuery(query, { upn, levels });

  const personas = response.records.map(record => {
    return record.get('relation').properties;
  })

  return personas;
}

const readPersonaDeclarations = async (upn) => {

}

/**
 * Get all personas that directly control a given person
 * 
 * @param {string} upn
 * @param {number[]} levels
 * @returns {object[]} - An array of persona objects
 */
const readPersonaObey = async (upn, levels) => {
  const query = `MATCH (persona:Persona)-[rel:CONTROL]->(relation:Persona {upn: $upn})
  WHERE rel.level IN $levels
  RETURN persona`

  const response = await connector.runRawQuery(query, { upn, levels });

  const personas = response.records.map(record => {
    return record.get('persona').properties;
  })

  return personas;
}

/**
 * Get direct properties of a persona object
 * 
 * @param {string} upn
 * @returns {object} - The properties of the persona object
 */
const readPersonaProperties = async (upn) => {
  const query = `MATCH (persona:Persona {upn: $upn})
  RETURN persona`

  const response = await connector.runRawQuery(query, { upn });

  const persona = response.records.map(record => {
    return record.get('persona').properties;
  });

  return persona[0];
}

/**
 * Get a source object from the persona graph database
 * 
 * @param {string} sourceId
 * @returns {object} - The source object
 */
const readSource = async (sourceId) => {
  const query = `MATCH (source:Source {id: $sourceId})
  RETURN source`

  const response = await connector.runRawQuery(query, { sourceId });

  const source = response.records.map(record => {
    return record.get('source').properties;
  });

  return source[0];
}

/**
 * Get all personas declared by a given source
 * 
 * @param {string} sourceId
 * @returns {object[]} - An array of persona objects
 */
const readSourcePersonas = async (sourceId) => {
  const query = `MATCH (source:Source {id: $sourceId})-[:DECLARE]->(persona:Persona)
  RETURN persona`

  const response = await connector.runRawQuery(query, { sourceId });

  const personas = response.records.map(record => {
    return record.get('persona').properties;
  });

  return personas;
}

/**
 * Get all relationships declared by a given source
 * 
 * @param {string} sourceId
 * @returns {object[]} - An array of relationship objects
 */
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

  return relationships;
}

// TODO: Implement removePersonaDeclaration
const removePersonaDeclaration = async (sourceId, personaUpn, querySetOnly) => {

}

// TODO: Implement removeRelationshipDeclaration
const removeRelationshipDeclaration = async (sourceId, controlUpn, obeyUpn, querySetOnly) => {

}

/**
 * Execute a raw query against the persona graph database
 * 
 * @param {string} query - The cypher query to execute
 * @param {object} optionalParams - The parameters for the query
 * @returns {object} - The response from the database
 */
const runRawQuery = connector.runRawQuery;

/**
 * Execute an array of queries in a set of transactions
 * 
 * @param {object[]} queryArray - An array of query objects
 * @returns {object} - The response from the database
 */
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