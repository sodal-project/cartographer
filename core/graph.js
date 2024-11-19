const check = require('./check');
const connector = require('./graphNeo4jConnector');
const sourceUtils = require('./source');
const sourceStore = require('./sourceStore');
const personaUtils = require('./persona');
const graphFilter = require('./graphFilter');

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
 * @param {string} sid - OPTIONAL, the source id to remove the persona from
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query 
 * @returns {object} - The response from the database, or the query set object
 */
const removePersona = async (module, upn, sid, querySetOnly) => {
  if(!sid) {
    sid = sourceUtils.getSourceObject(module).sid;
  }

  const queries = [];
  
  queries.push({
    query: `MATCH (persona:Persona { upn: $upn })-[r {sid: $sid }]-()
    DELETE r`,
    values: { upn, sid }
  })
  queries.push({
    query: `MATCH (source:Source { sid: $sid })-[r:DECLARE]->(persona:Persona {upn: $upn})
    DELETE r`,
    values: { upn, sid }
  })

  if(querySetOnly) {
    return queries;
  }

  const response = await connector.runRawQueryArray(queries);

  console.log('Removed persona:', upn);
  return response;
}

/**
 * Completely remove a persona from the persona graph database
 * 
 * WARNING: this may impact other sources that reference 
 * this persona. Other sources that declare this persona may 
 * redeclare it when next synced
 * 
 * @param {string} module - automatically passed by core
 * @param {string} upn - the upn of the persona to delete
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query
 * @returns {object} - The response from the database, or the query set object
 */
const deletePersona = async (module, upn, querySetOnly) => {
  const queries = [];
  
  queries.push({
    query: `MATCH (persona:Persona { upn: $upn })
    DETACH DELETE persona`,
    values: { upn }
  })

  if(querySetOnly) {
    return queries;
  }

  const response = await connector.runRawQueryArray(queries);

  console.log('Deleted persona:', upn);
  return response;
}

/**
 * Delete a source from the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {string} sid - OPTIONAL, the source id to delete
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query
 * @returns {object} - The response from the database, or the query set object
 */
const deleteSource = async (module, sid, querySetOnly) => {
  if(!sid) {
    sid = sourceUtils.getSourceObject(module).sid;
  }

  const queries = [];
  queries.push({
    query: `MATCH (source:Source {sid: $sid})
    DETACH DELETE source`,
    values: { sid }
  })
  queries.push({
    query: `MATCH ()-[r:CONTROL]-() WHERE r.sid = $sid DELETE r`,
    values: { sid }
  })

  if(querySetOnly) {
    return queries;
  }

  const response = await connector.runRawQueryArray(queries);

  console.log('Deleted source:', sid);
  return response
}

/**
 * Merge a persona with the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {object} persona - a valid persona object
 * @param {object} source - OPTIONAL, a valid source object
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query
 * @returns {Array} - The response from the database, or the query set array object
 */
const mergePersona = async (module, persona, source, querySetOnly) => {
  if(!persona) {
    throw new Error('Persona object is required');
  } else {
    check.personaObject(persona);
  }

  if(!source) {
    source = sourceUtils.getSourceObject(module);
  }
  check.sourceObject(source);

  const upn = persona.upn;
  const controls = persona.control || [];
  const obeys = persona.obey || [];

  delete persona.upn;
  delete persona.control;
  delete persona.obey;

  const queries = []
  const relationships = [];

  queries.push({
    query: `MERGE (source:Source {sid: $source.sid})
    MERGE (persona:Persona {upn: $upn})
    MERGE (source)-[:DECLARE]->(persona)
    SET persona += $persona
    SET source += $source`,
    values: { source, persona, upn }
  })

  for(const control of controls) {
    const rel = control;
    rel.controlUpn = upn;
    rel.obeyUpn = control.upn;
    delete rel.upn;

    rel.level = parseInt(rel.level);
    rel.confidence = parseFloat(rel.confidence);

    relationships.push(rel);
  }

  for(const obey of obeys) {
    const rel = obey;
    rel.obeyUpn = upn;
    rel.controlUpn = obey.upn;
    delete rel.upn;

    rel.level = parseInt(rel.level);
    rel.confidence = parseFloat(rel.confidence);

    relationships.push(rel);
  }

  for(const rel of relationships) {
    const obey = personaUtils.newFromUpn(rel.obeyUpn);
    const control = personaUtils.newFromUpn(rel.controlUpn);
    
    delete rel.obeyUpn;
    delete rel.controlUpn;
    delete obey.control;
    delete obey.obey;
    delete control.control;
    delete control.obey;

    queries.push({
      query: `MERGE (control:Persona { upn: $control.upn }) 
      MERGE (obey:Persona { upn: $obey.upn })
      MERGE (source:Source { sid: $source.sid })
      MERGE (source)-[:DECLARE]->(control)
      MERGE (source)-[:DECLARE]->(obey)
      MERGE (control)-[r:CONTROL { sid: $source.sid }]->(obey)
      SET source += $source
      SET control += $control
      SET obey += $obey
      SET r += $rel
      RETURN r`,
      values: { source, obey, control, rel }
    })
  }

  if(querySetOnly) {
    return queries;
  }

  const response = await connector.runRawQueryArray(queries);

  console.log('Merged persona:', upn);
  return response;
}

/**
 * Merge an array of personas with the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {object} personaArray - an array of persona objects
 * @param {object} source - OPTIONAL, a valid source object
 * @param {boolean} querySetOnly - OPTIONAL, if true, return a query set object instead of executing the query
 * @returns {Array} - The response from the database, or the query set array object
 */
const mergePersonas = async (module, personaArray, source, querySetOnly) => {
  let queries = [];
  for(const persona of personaArray) {
    queries = queries.concat(await mergePersona(module, persona, source, true));
  }

  if(querySetOnly) {
    return queries;
  }

  return await connector.runRawQueryArray(queries);
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

  const query = `MERGE (source:Source {sid: $source.sid})
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
const readPersona = async (module, upn) => {

  // get the persona and its properties
  const query = `MATCH (persona:Persona {upn: $upn})
  RETURN persona`

  const response = await connector.runRawQuery(query, { upn });

  const personaResponse = response.records.map(record => {
    return record.get('persona').properties;
  })
  const persona = personaResponse[0];

  if(!persona) {
    return null;
  }

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
 * Filter and sort personas from the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {object} filter - OPTIONAL, a filter object
 * @param {object} sort - OPTIONAL, a sort object
 */
const readPersonas = async (module, filter, sort, asUpnArray) => {
  const results = await graphFilter(filter, sort, asUpnArray);

  return results;
}

/**
 * Get a source object from the persona graph database
 * 
 * @param {string} module - automatically passed by core
 * @param {string} sid - OPTIONAL, the source id to read
 * @returns {object} - The source object
 */
const readSource = async (module, sid) => {
  if(!sid) {
    sid = sourceUtils.getSourceObject(module).id;
  }
  check.sidString(sid);

  const query = `MATCH (source:Source {sid: $sid})
  RETURN source`

  const response = await connector.runRawQuery(query, { sid });

  const source = response.records.map(record => {
    return record.get('source').properties;
  });

  return source[0];
}

/**
 * Get all personas declared by a given source
 * 
 * @param {string} module - automatically passed by core
 * @param {string} sid - OPTIONAL, the source id to read personas from
 * @returns {object[]} - An array of persona objects
 */
const readSourcePersonas = async (module, sid) => {
  if(!sid) {
    sid = sourceUtils.getSourceObject(module).sid;
  }

  const query = `MATCH (source:Source {sid: $sid})-[:DECLARE]->(persona:Persona)
  RETURN persona`

  const response = await connector.runRawQuery(query, { sid });

  const personas = response.records.map(record => {
    return record.get('persona').properties;
  });

  return personas;
}

/**
 * Get all relationships declared by a given source
 * 
 * @param {string} module - automatically passed by core
 * @param {string} sid - The source id to read relationships from
 * @returns {object[]} - An array of relationship objects
 */
const readSourceRelationships = async (module, sid) => {
  const query = `MATCH (persona:Persona)-[rel:CONTROL]->(relation:Persona)
  WHERE rel.sid = $sid
  RETURN DISTINCT persona.upn AS controlUpn, relation.upn AS obeyUpn, properties(rel)`

  const response = await connector.runRawQuery(query, { sid });

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
const runRawQuery = async (module, query, optionalParams, doCache) => {
  return await connector.runRawQuery (query, optionalParams, doCache);
}

/**
 * Execute an array of queries in a set of transactions
 * 
 * @param {object[]} queryArray - An array of query objects
 * @returns {object} - The response from the database
 */
const runRawQueryArray = async (module, queryArray, doCache) => {
  return await connector.runRawQueryArray(queryArray, doCache);
}

const syncPersonas = async (module, personaArray, customSource) => {

  const source = customSource ? customSource : sourceUtils.getSourceObject(module);
  check.sourceObject(source);

  const store = sourceStore.newStore(source)
  sourceStore.addPersonas(store, personaArray);
  check.sourceStoreObject(store);

  const oldStore = await readSourceStore(module, source.sid); 
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
 * @param {string} sid 
 * @returns {object} - A source store object representing the entire
 *  graph associated with this source
 */
const readSourceStore = async (module, sid) => {

  // get the source object
  const source = await readSource(module, sid);

  // if the source doesn't exist, return null
  if(!source) {
    console.log(`Source ${sid} not found`);
    return null;
  }

  // get all personas for this source
  const graphPersonas = await readSourcePersonas(module, sid);

  // get all relationships for this source
  const graphRelationships = await readSourceRelationships(module, sid);

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
    console.error(`Error validating the source store for Source: ${sid}`);
    throw error;
  }

  return store;
}

const unlinkPersonas = async (module, upn1, upn2, sid) => {

  const query = `MATCH (persona1:Persona {upn: $upn1})-[r:CONTROL]-(persona2:Persona {upn: $upn2})
  WHERE r.sid = $sid
  DELETE r`

  if(!sid) {
    sid = sourceUtils.getSourceObject(module).sid;
  }

  const response = await connector.runRawQuery(query, { upn1, upn2, sid });

  console.log('Unlinked personas:', upn1, upn2);

  return response;
}


module.exports = {
  deleteOrphanedPersonas,
  deletePersona,
  removePersona,
  deleteSource,
  mergePersona,
  mergePersonas,
  mergeSource,
  readOrphanedPersonas,
  readPersona,
  readPersonas,
  readSource,
  readSourcePersonas,
  readSourceRelationships,
  runRawQuery,
  runRawQueryArray,
  syncPersonas,
  unlinkPersonas,
}