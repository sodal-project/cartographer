const check = require('./check');
const connector = require('./graphNeo4jConnector');
const sourceUtils = require('./source');
const sourceStore = require('./sourceStore');

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
const deleteOrphanedPersonas = async (module) => { 

}

// TODO: Implement remove function
const removePersona = async (module, upn, sourceId, querySetOnly) => {

}

/**
 * Delete a source from the persona graph database
 * 
 * @param {string} sourceId 
 * @param {boolean} querySetOnly - if true, return a query set object instead of executing the query
 * @returns {object} - The response from the database, or the query set object
 */
const deleteSource = async (module, sourceId, querySetOnly) => {
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

// TODO: Implement merge function
const mergePersona = async (module, persona, source, querySetOnly) => {
}

/**
 * Merge a source with the persona graph database
 * 
 * @param {object} source - a valid source object
 * @param {boolean} querySetOnly - if true, return a query set object instead of executing the query
 * @returns {object} - The source object from the database, or the query set object
 */
const mergeSource = async (module, source, querySetOnly) => {
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
const readFilter = async (module, filter, pageParams) => {

}

/**
 * Read all personas that are not declared by any source
 * 
 * @returns {object[]} - An array of persona objects
 */ 
const readOrphanedPersonas = async (module) => {
  const query = `MATCH (persona:Persona)
  WHERE NOT ()-[:DECLARE]->(persona)
  RETURN persona`

  const response = await connector.runRawQuery(query);

  const personas = response.records.map(record => {
    return record.get('persona').properties;
  });

  return personas;
}

// TODO: Implement readPersona
const readPersona = async (module, upn) => {

}

/**
 * Get a source object from the persona graph database
 * 
 * @param {string} sourceId
 * @returns {object} - The source object
 */
const readSource = async (module, sourceId) => {
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
const readSourcePersonas = async (module, sourceId) => {
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
const readSourceRelationships = async (module, sourceId) => {
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

/**
 * Execute a raw query against the persona graph database
 * 
 * @param {string} query - The cypher query to execute
 * @param {object} optionalParams - The parameters for the query
 * @returns {object} - The response from the database
 */
const runRawQuery = async (module, query, optionalParams) => {
  return await connector.runRawQuery (query, optionalParams);
}

/**
 * Execute an array of queries in a set of transactions
 * 
 * @param {object[]} queryArray - An array of query objects
 * @returns {object} - The response from the database
 */
const runRawQueryArray = async (module, queryArray) => {
  return await connector.runRawQueryArray(queryArray);
}

const syncPersonas = async (module, personaArray, customSource) => {

  const source = customSource ? customSource : sourceUtils.getSourceObject(module);
  check.sourceObject(source);

  const store = sourceStore.newStore(source)
  sourceStore.addPersonas(store, personaArray);
  check.sourceStoreObject(store);

  const oldStore = await readSourceStore(module, source.id); 
  const queries = sourceStore.getSyncQueries(store, oldStore);

  // ensure the source is in the graph
  await mergeSource(module, source);

  // execute the merge queries
  if(queries.length > 0) {
    console.log(`Merge Sync with ${queries.length} queries`);
    return await connector.runRawQueryArray(queries);
  } else {
    console.log(`Merge Sync found ${queries.length} queries, no changes to process`);
  }

}

/**
 * Get a source store object from the graph
 * 
 * @param {string} sourceId 
 * @returns {object} - A source store object representing the entire
 *  graph associated with this source
 */
const readSourceStore = async (module, sourceId) => {

  // get the source object
  const source = await readSource(module, sourceId);

  // if the source doesn't exist, return null
  if(!source) {
    console.log(`Source ${sourceId} not found`);
    return null;
  }

  // get all personas for this source
  const graphPersonas = await readSourcePersonas(module, sourceId);

  // get all relationships for this source
  const graphRelationships = await readSourceRelationships(module, sourceId);

  // create a new store object
  let store = sourceStore.newStore(source);

  // add personas to the store
  store = sourceStore.addPersonas(store, graphPersonas);

  // add relationships to the store
  store = sourceStore.addRelationships(store, graphRelationships);

  // validate the store object
  try {
    check.sourceStoreObject(store);
  } catch (error) {
    console.error(`Error validating the source store for Source: ${sourceId}`);
    throw error;
  }

  return store;
}

module.exports = {
  deleteOrphanedPersonas,
  removePersona,
  deleteSource,
  mergePersona,
  mergeSource,
  readFilter,
  readOrphanedPersonas,
  readPersona,
  readSource,
  readSourcePersonas,
  readSourceRelationships,
  runRawQuery,
  runRawQueryArray,
  syncPersonas,
}