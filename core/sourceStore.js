/**
 * Source Store
 * 
 * Source Store provides a simple way to sync source data
 * with the persona graph.
 * 
 * WARNING: Merging an incomplete source store will
 * result in data loss. A merge operation will remove
 * any source personas or relationships from the 
 * graph that are not present in the new source store.
 * 
 * Source Store
 * -- builds Source Stores from standard persona objects
 * -- compares the current source graph state with new source state
 * -- generates and executes the necessary queries to update the graph
 * 
 * A Source Store object includes modified persona objects.
 * These modified objects are NOT canonical persona objects. 
 * Do not access them directly.
 */

const utilPersona = require('./persona');
const utilGraph = require('./graph');
const check = require('./check');

/**
 * Create a new source store object
 * 
 * Structure of a source store object
 * {
 *   source: {
 *     id: string,
 *     name: string,
 *     lastUpdate: string,
 *   },
 *   personas: {
 *     ...props,
 *     control: [{
 *      upn: { 
 *        level,
 *        confidence,
 *        ...customProps
 *      },
 *      {...}]
 *    },
 *   }
 * }
 * 
 * @param {object} source - The source object
 * @returns {object} - The new source store object
 */
const newStore = (source) => {
  check.sourceObject(source);
  const store = {
    source: source,
    personas: {},
  };
  return store;
}

/**
 * Add a persona object to the store
 * 
 * WARNING: This function modifies the incoming store object
 * 
 * @param {object} store
 * @param {object[]} personas
 * @returns {object} - The updated store object
 */
const addPersonas = (store, personas) => {
  for(const persona of personas) {
    check.personaObject(persona);
    addPersona(store, persona);
  }
  return store;
}

/**
 * Add an array of relationship objects to the store
 * 
 * WARNING: This function modifies the incoming store object
 * 
 * @param {object} store
 * @param {object[]} relationships
 * @returns {object} - The updated store object
 */
const addRelationships = (store, relationships) => {

  for(const relationship of relationships) {
    // skip if source is not the same as the store
    if(relationship.sourceId && relationship.sourceId !== store.source.id) { continue; }

    const controlUpn = relationship.controlUpn;
    const obeyUpn = relationship.obeyUpn;

    delete relationship.controlUpn;
    delete relationship.obeyUpn;
    delete relationship.sourceId;

    const subordinatePersona = forcePersona(store, obeyUpn);
    const controlPersona = forcePersona(store, controlUpn);

    // add relationship if it doesn't already exist,
    //   or if the existing relationship is lower confidence
    const confidence = relationship.confidence;
    if(!controlPersona.control[obeyUpn] || confidence > controlPersona.control[obeyUpn].confidence) {
      controlPersona.control[obeyUpn] = relationship;
    }
  }
  return store;
}

/**
 * Merge a source store object with the graph
 * 
 * @param {object} store - The source store object
 * @returns {object} - The result of the merge queries
 */
const merge = async (store) => {
  check.sourceStoreObject(store);
  
  let queries = [];

  const sourceId = store.source.id;
  
  await utilGraph.mergeSource(store.source);
  const storeOld = await readStore(sourceId);

  // if there is no previous store, or the previous store is empty,
  //   execute a simple merge (no source comparison operations)
  if(!storeOld) {
    console.log("Merging with no previous store, executing non-sync merge.");
    queries = queries.concat(getSimpleMergeQueries(store));
  } else if(Object.keys(storeOld.personas).length === 0) {
    console.log("Merging with empty previous store, executing non-sync merge.");
    queries = queries.concat(getSimpleMergeQueries(store));
  
  // if this source already exists in the graph, execute a sync merge
  } else {
    check.sourceStoreObject(storeOld);

    // ensure source stores match before continuing
    if(store.source.id !== storeOld.source.id) {
      throw Error(`Cannot merge stores with different sources.`);
    }

    // get a list of all existing upns in the graph for this source
    //   as the final step of the sync, we will
    //   undeclare any personas that were not processed
    let oldUpns = Object.keys(storeOld.personas);
    
    // compare each persona in the new store with the old store
    for(const upn in store.personas) {
      const personaNew = store.personas[upn];
      const personaOld = storeOld.personas[upn];
  
      // if the persona is already declared in the graph, compare and sync the persona details
      if(oldUpns.includes(upn)) {

        // sync the persona properties
        const syncPersonaQuery = getSyncPersonaQuery(personaNew, personaOld)
        if(syncPersonaQuery) { queries.push(syncPersonaQuery); }

        // sync the persona control relationships
        queries = queries.concat(getSyncControlQueries(sourceId, personaNew, personaOld));
  
        // indicate that this persona has been processed
        oldUpns = oldUpns.filter((oldUpn) => oldUpn !== upn);
      
      // if the persona is not declared, declare it and all of its control relationships
      } else {
        queries.push(getPersonaQuery(personaNew));
        queries = queries.concat(getControlQueries(sourceId, personaNew));
      }
    }

    // undeclare any old personas that were not in the new store
    for(const upn of oldUpns) {
      queries.push(getUndeclarePersonaQuery(upn));
      queries = queries.concat(getUndeclareControlQuery(upn));
    }
  }

  // execute the merge queries
  console.log(`Merge Sync with ${queries.length} queries`);
  return await utilGraph.runRawQueryArray(queries);
}

/**
 * Get a source store object from the graph
 * 
 * @param {string} sourceId 
 * @returns {object} - A source store object representing the entire
 *  graph associated with this source
 */
const readStore = async (sourceId) => {

  // get the source object
  const source = await utilGraph.readSource(sourceId);

  // if the source doesn't exist, return null
  if(!source) {
    console.error(`Source ${sourceId} not found`);
    return null;
  }

  // get all personas for this source
  const graphPersonas = await utilGraph.readSourcePersonas(sourceId);

  // get all relationships for this source
  const graphRelationships = await utilGraph.readSourceRelationships(sourceId);

  // create a new store object
  let store = newStore(source);

  // add personas to the store
  store = addPersonas(store, graphPersonas);

  // add relationships to the store
  store = addRelationships(store, graphRelationships);

  return store;
}

/**
 * Get an array of queries to merge a complete, new source store with the graph
 * 
 * @param {object} store 
 * @returns {object[]} - An array of queries to blind merge the store with the graph
 */
const getSimpleMergeQueries = (store) => {

  check.sourceStoreObject(store);

  console.log(`Processing ${store.source.name} store`);
  console.log(`Found ${Object.keys(store.personas).length} personas`);

  // a merge has three components:
  //   - merge all persona nodes with related persona properties
  //   - declare all control relationships for those personas
  //   - create control relationship edges between related personas
  const personaQueries = getSourcePersonaQueries(store);
  const declareQueries = getSourceDeclareQueries(store);
  const controlQueries = getStoreControlQueries(store);

  const queries = [
    ...personaQueries,
    ...declareQueries,
    ...controlQueries,
  ]
  console.log(`Identified: 
    ${personaQueries.length} persona queries,
    ${declareQueries.length} declare queries,
    ${controlQueries.length} control queries
    `);
  console.log(`Merge with ${queries.length} queries`);

  return queries;
}

const forcePersona = (store, upn) => {
  if(!store.personas[upn]) {
    const tempPersona = utilPersona.newFromUpn(upn);
    const storePersona = {
      upn: upn,
      type: tempPersona.type,
      platform: tempPersona.platform,
      id: tempPersona.id,
      control: {},
    }
    store.personas[upn] = storePersona;
  }
  return store.personas[upn];
}

const addPersona = (store, persona) => {
  const upn = persona.upn;
  const storePersona = forcePersona(store, upn);

  for(const key in persona) {
    // if the property doesn't exist, add it
    if(!storePersona[key]) {
      switch(key) {
        case "control":
        case "obey":
          break;
        default:
          storePersona[key] = persona[key];
          break;
      }
    } 
  }
  store.personas[upn] = storePersona;

  const newRels = utilPersona.getRelationships(persona);
  store = addRelationships(store, newRels);

  return store;
}

//
// Merge Queries
//

const getSourceDeclareQueries = (store) => {
  const queries = [];

  for(const upn in store.personas) {
    queries.push(getDeclareQuery(store.source.id, upn));
  }
  return queries;
}

const getDeclareQuery = (sourceId, upn) => {
  return {
    query: `MATCH (source:Source { id: $sourceId }), (persona:Persona { upn: $upn })
  MERGE (source)-[rel:DECLARE]->(persona)
  `,
    values: {
      sourceId: sourceId,
      upn: upn,
    }
  }
}

const getSourcePersonaQueries = (store) => {
  const queries = [];
  for(const upn in store.personas) {
    queries.push(getPersonaQuery(store.personas[upn]));
  }
  return queries;
}

const getPersonaQuery = (persona) => { 
  const query = `MERGE (persona:Persona { upn: $upn })
    SET persona += $personaProps
    `
  const props = {};

  for(const prop in persona) {
    switch(prop) {
      case "control":
      case "obey":
      case "upn":
        break;
      default:
        props[prop] = persona[prop];
        break;
    }
  }

  return {
    query: query,
    values: {
      upn: persona.upn,
      personaProps: props,
    }
  }
}

const getStoreControlQueries = (store) => {
  let queries = [];

  for(const upn in store.personas) {
    queries = queries.concat(getControlQueries(store.source.id, store.personas[upn]));
  }
  return queries;
}

const getControlQueries = (sourceId, persona) => {
  const queries = [];
  for(const obeyUpn in persona.control) {
    queries.push(getControlQuery(sourceId, persona.upn, obeyUpn, persona.control[obeyUpn]));
  }
  return queries;
}

const getControlQuery = (sourceId, controlUpn, obeyUpn, relProps) => {
  relProps.sourceId = sourceId;
  return {
    query: `MATCH (control:Persona { upn: $controlUpn }), (obey:Persona { upn: $obeyUpn })
    MERGE (control)-[rel:CONTROL { sourceId: $relProps.sourceId }]->(obey)
    SET rel += $relProps
    `,
    values: {
      controlUpn: controlUpn,
      obeyUpn: obeyUpn,
      relProps: relProps,
    }
  }
}

//
// Merge Sync Queries
//

const getSyncPersonaQuery = (personaNew, personaOld) => {
  const query = `MATCH (persona:Persona { upn: $upn })
    SET persona += $personaProps
    `
  const props = {};

  for(const prop in personaNew) {
    switch(prop) {
      case "control":
      case "obey":
      case "upn":
        break;
      default:
        if(personaNew[prop] !== personaOld[prop]) {
          props[prop] = personaNew[prop];
        }
        break;
    }
  }

  // TODO: handle per-source persona property removal
  // check for explicitly removed properties
  // for(const prop in personaOld) {
  //   if(personaOld[prop] === "") {
  //    props[prop] = null;
  //  }
  // }
  
  if(Object.keys(props).length === 0) { 
    return null; 
  } else {
    return {
      query: query,
      values: {
        upn: personaNew.upn,
        personaProps: props,
      }
    }
  }
}

const getSyncControlQueries = (sourceId, personaNew, personaOld) => {
  let queries = [];

  let controlRelOldUpns = Object.keys(personaOld.control);
  
  for(const obeyUpn in personaNew.control) {
    const controlRelNew = personaNew.control[obeyUpn];
    const controlRelOld = personaOld.control[obeyUpn];

    if(!controlRelOld) {
      queries.push(getControlQuery(sourceId, personaNew.upn, obeyUpn, controlRelNew));
    } else {
      const relProps = {};
      for(const prop in controlRelNew) {
        if(prop === "sourceId") { continue; }
        if(controlRelNew[prop] !== controlRelOld[prop]) {
          relProps[prop] = controlRelNew[prop];
        }
      }
      for(const prop in controlRelOld) {
        if(prop === "sourceId") { continue; }
        if(controlRelNew[prop] === undefined) {
          relProps[prop] = null;
        }
      }
      controlRelOldUpns = controlRelOldUpns.filter((upn) => upn !== obeyUpn);
      if(Object.keys(relProps).length > 0) {
        queries.push(getControlQuery(sourceId, personaNew.upn, obeyUpn, relProps));
      }
    }
  }
  for(const controlRelOldUpn of controlRelOldUpns) {
    queries.push(getRemoveControlQuery(sourceId, personaNew.upn, controlRelOldUpn));
  }
  return queries;
}

/**
 * Get a query set to remove a persona declaration
 * 
 * @param {string} sourceId
 * @param {string} upn
 * @returns {object} - The query set object
 */
const getUndeclarePersonaQuery = (sourceId, upn) => {
  const query = `MATCH (source:Source { id: $sourceId })-[rel:DECLARE]->(persona:Persona { upn: $upn })
    DELETE rel
    `
  return {query, values: {sourceId, upn}};
}

/**
 * Get a query set to remove a control relationship
 * 
 * @param {string} sourceId
 * @param {string} upn
 * @returns {object} - The query set object
 */
const getUndeclareControlQuery = (sourceId, upn) => {
  const query = `MATCH (persona:Persona { upn: $upn })-[rel:CONTROL]-(:Persona)
    WHERE rel.sourceId = $sourceId
    AND persona.upn = $upn
    DELETE rel
    `
  return {query, values: {sourceId, upn}};
}

/**
 * Get a query set to remove a control relationship
 * 
 * @param {string} sourceId 
 * @param {string} controlUpn 
 * @param {string} obeyUpn 
 * @returns {object} - The query set object
 */
const getRemoveControlQuery = (sourceId, controlUpn, obeyUpn) => {
  const query = `MATCH (control:Persona { upn: $controlUpn })-[rel:CONTROL]->(obey:Persona { upn: $obeyUpn })
    WHERE rel.sourceId = $sourceId
    DELETE rel
    `
  return {query, values: {sourceId, controlUpn, obeyUpn}};
}

module.exports = {
  newStore,
  addPersonas,
  addRelationships,
  merge,
}