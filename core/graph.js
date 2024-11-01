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

/**
 * Delete Personas that are not declared by any source
 * 
 * @param {string} module - automatically passed by core
 * @returns {object} - The response from the database
 */
const deleteOrphanedPersonas = async (module) => { 
  const query = `MATCH (persona:Persona)
  WHERE NOT ()-[:DECLARE]->(persona)
  DETACH DELETE persona`

  const response = await connector.runRawQuery(query);

  console.log('Deleted orphaned personas');
  return response;
}

/**
 * Detach a persona from a source
 * 
 * @param {string} module - automatically passed by core
 * @param {string} upn - the upn of the persona to remove
 * @param {string} sourceId - OPTIONAL, the source id to remove the persona from
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query 
 * @returns {object} - The response from the database, or the query set object
 */
const removePersona = async (module, upn, sourceId, querySetOnly) => {
  if(!sourceId) {
    sourceId = sourceUtils.getSourceObject(module).id;
  }

  const queries = [];
  
  queries.push({
    query: `MATCH (persona:Persona {upn: $upn})-[r {sourceId: $sourceId }]-()
    DELETE r`,
    values: { upn, sourceId }
  })
  queries.push({
    query: `MATCH (source:Source { $sourceId })-[r:DECLARE]->(persona:Persona {upn: $upn})
    DELETE r`,
    values: { upn, sourceId }
  })

  if(querySetOnly) {
    return queries;
  }

  const response = await connector.runRawQueryArray(queries);

  console.log('Removed persona:', upn);
  return response;
}

/**
 * Delete a source from the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {string} sourceId - OPTIONAL, the source id to delete
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query
 * @returns {object} - The response from the database, or the query set object
 */
const deleteSource = async (module, sourceId, querySetOnly) => {
  if(!sourceId) {
    sourceId = sourceUtils.getSourceObject(module).id;
  }

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

/**
 * Merge a persona with the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {object} persona - a valid persona object
 * @param {object} source - OPTIONAL, a valid source object
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query
 * @returns {object} - The response from the database, or the query set object
 */
const mergePersona = async (module, persona, source, querySetOnly) => {
  if(!persona) {
    throw new Error('Persona object is required');
  } else {
    check.personaObject(persona);
  }

  const upn = persona.upn;
  
  // remove upn from persona object
  delete persona.upn;

  if(!source) {
    source = sourceUtils.getSourceObject(module);
  }
  check.sourceObject(source);

  const queries = [];

  queries.push({
    query: `MERGE (persona:Persona {upn: $upn})
    SET persona += $persona`,
    values: { upn, persona }
  })
  queries.push({
    query: `MERGE (source:Source {id: $source.id})
    SET source.name = $source.name, source.lastUpdate = $source.lastUpdate`,
    values: { source }
  })
  queries.push({
    query: `MERGE (source:Source {id: $source.id })-[:DECLARE]->(persona:Personas {upn: $upn})`,
    values: { source, upn }
  })

  if(querySetOnly) {
    return queries;
  }

  const response = await connector.runRawQueryArray(queries);

  console.log('Merged persona:', upn);
  return response;
}

/**
 * Merge a source with the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {object} source - OPTIONAL, a valid source object
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query
 * @returns {object} - The source object from the database, or the query set object
 */
const mergeSource = async (module, source, querySetOnly) => {
  if(!source) {
    source = sourceUtils.getSourceObject(module);
  }
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
 * @param {string} module - automatically passed by core
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

/**
 * Read a persona object from the persona graph database
 *   and include all direct control relationships
 * 
 * @param {string} module - automatically passed by core 
 * @param {string} upn - the upn of the persona to read 
 * @returns {object} - The persona object
 */
const readPersonaObject = async (module, upn) => {

  // get the persona and its properties
  const query = `MATCH (persona:Persona {upn: $upn})
  RETURN persona`

  const response = await connector.runRawQuery(query, { upn });

  const personaResponse = response.records.map(record => {
    return record.get('persona').properties;
  })
  const persona = personaResponse[0];

  // get all personas that this perona controls
  const controlQuery = `MATCH (persona:Persona {upn: $upn})-[relationship:CONTROL]->(relation:Persona)
  RETURN relation, relationship`

  const controlResponse = await connector.runRawQuery(controlQuery, { upn });

  const control = controlResponse.records.map(record => {
    return {
      upn: record.get('relation').properties.upn,
      ...record.get('relationship').properties
    }
  });
  persona.control = control;

  // get all personas that control this persona
  const obeyQuery = `MATCH (persona:Persona {upn: $upn})<-[relationship:CONTROL]-(relation:Persona)
  RETURN relation, relationship`

  const obeyResponse = await connector.runRawQuery(obeyQuery, { upn });

  const obey = obeyResponse.records.map(record => {
    return {
      upn: record.get('relation').properties.upn,
      ...record.get('relationship').properties
    }
  });
  persona.obey = obey;

  check.personaObject(persona);
  return persona;
}

/**
 * Get a source object from the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {string} sourceId - OPTIONAL, the source id to read
 * @returns {object} - The source object
 */
const readSource = async (module, sourceId) => {
  if(!sourceId) {
    sourceId = sourceUtils.getSourceObject(module).id;
  }
  check.sourceId(sourceId);

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
 * @param {string} module - automatically passed by core
 * @param {string} sourceId - OPTIONAL, the source id to read personas from
 * @returns {object[]} - An array of persona objects
 */
const readSourcePersonas = async (module, sourceId) => {
  if(!sourceId) {
    sourceId = sourceUtils.getSourceObject(module).id;
  }

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
 * @param {string} module - automatically passed by core
 * @param {string} sourceId - The source id to read relationships from
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
  readPersonaObject,
  readSource,
  readSourcePersonas,
  readSourceRelationships,
  runRawQuery,
  runRawQueryArray,
  syncPersonas,
}