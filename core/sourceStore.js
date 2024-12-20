
import utilPersona from './persona.js';
import check from './check.js';

/**
 * @fileoverview Source Store Management
 * @description
 * Source Store provides a way to sync source data with the persona graph.
 * It handles building source stores from standard persona objects,
 * comparing current graph state with new source state, and generating
 * the necessary queries to update the graph.
 * 
 * WARNING: Merging an incomplete source store will result in data loss.
 * A merge operation will remove any source personas or relationships 
 * from the graph that are not present in the new source store.
 */

/** @typedef {import('./types').PersonaObject} PersonaObject */
/** @typedef {import('./types').SourceObject} SourceObject */
/** @typedef {import('./types').QuerySet} QuerySet */
/** @typedef {import('./types').StoreRelationship} StoreRelationship */

/**
 * Create a new source store object
 * 
 * @param {SourceObject} source - The source object that owns this store
 * @returns {Object} A new source store object
 * @property {SourceObject} source - The source object
 * @property {Object.<string, Object>} personas - Map of UPNs to modified persona objects
 * @throws {TypeError} If source object is invalid
 * @example
 * const store = newStore({
 *   sid: 'source:github:main',
 *   name: 'GitHub Main',
 *   lastUpdate: Date.now()
 * });
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
 * Add an array of persona objects to the store
 * 
 * WARNING: This function modifies the incoming store object
 * 
 * @param {Object} store - The source store object to modify
 * @param {PersonaObject[]} personas - Array of persona objects to add
 * @returns {Object} The updated store object
 * @throws {TypeError} If any persona objects are invalid
 * @example
 * const store = newStore(source);
 * addPersonas(store, [
 *   {
 *     upn: 'upn:github:user:alice',
 *     platform: 'github',
 *     type: 'user',
 *     id: 'alice'
 *   }
 * ]);
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
 * @param {Object} store - The source store object to modify
 * @param {Object[]} relationships - Array of relationship objects to add
 * @returns {Object} The updated store object
 * @throws {TypeError} If any relationship objects are invalid
 * @example
 * addRelationships(store, [{
 *   controlUpn: 'upn:github:org:acme',
 *   obeyUpn: 'upn:github:user:alice',
 *   level: 9,
 *   confidence: 1.0
 * }]);
 */
const addRelationships = (store, relationships) => {
  for(const relationship of relationships) {
    // skip if source is not the same as the store
    if(relationship.sid && relationship.sid !== store.source.sid) { continue; }

    const controlUpn = relationship.controlUpn;
    const obeyUpn = relationship.obeyUpn;

    delete relationship.controlUpn;
    delete relationship.obeyUpn;
    delete relationship.sid;

    // get or create the control and subordinate personas
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
 * Generate queries to sync a source store with the graph
 * 
 * @param {Object} store - The new source store object
 * @param {Object} [storeOld] - OPTIONAL, the current source store object
 * @returns {QuerySet[]} Array of queries to update the graph
 * @throws {TypeError} If store objects are invalid
 * @throws {Error} If stores have different sources
 * @example
 * const queries = getSyncQueries(newStore, oldStore);
 * // Returns array of queries to:
 * // 1. Remove personas/relationships not in new store
 * // 2. Update changed personas/relationships
 * // 3. Add new personas/relationships
 */
const getSyncQueries = (store, storeOld) => {
  check.sourceStoreObject(store);

  let personaQueries = [];
  let controlQueries = [];
  let declareQueries = [];

  let newPersonas = 0;
  let updatedPersonas = 0;
  let undeclaredPersonas = 0;
  let newRels = 0;
  let updatedRels = 0; 
  let undeclaredRels = 0;

  const sid = store.source.sid;

  if(storeOld){
    // check that the old source data is valid
    check.sourceStoreObject(storeOld);
    if(store.source.sid !== storeOld.source.sid) {
      throw Error(`Cannot merge stores with different sources.`);
    }

    // create array of upns in the old store that are not in new store
    const oldUpns = Object.keys(storeOld.personas).filter((upn) => !store.personas[upn]);

    // undeclare old personas that are not in the new store
    for(const upn of oldUpns) {
      personaQueries.push(getUndeclarePersonaQuery(sid, upn));
      controlQueries = controlQueries.concat(getUndeclareControlQuery(sid, upn));
      undeclaredPersonas++;
      undeclaredRels += Object.keys(storeOld.personas[upn]?.control).length;
    }
  }

  for(const upn in store.personas) {
    const personaNew = store.personas[upn];
    const personaOld = storeOld?.personas[upn];

    // sync the persona properties
    const personaQuery = getPersonaQuery(personaNew, personaOld)

    // if the persona query is not null, the persona must be updated or created
    if(personaQuery) {
      personaQueries.push(personaQuery); 

      // if the persona is new, declare it
      if(!personaOld) { 
        newPersonas++; 
        declareQueries.push(getDeclareQuery(sid, upn));
      }
      else { updatedPersonas++; }
    }

    // sync the persona control relationships
    const personaControlQueries = getSyncControlQueries(sid, personaNew, personaOld);
    if(personaControlQueries.length > 0) {
      if(!personaOld) { newRels++; }
      else { updatedRels++; }
    }
    controlQueries = controlQueries.concat(personaControlQueries);
  }

  // Report merge statistics
  const incomingPersonas = Object.keys(store.personas).length;
  const existingPersonas = storeOld ? Object.keys(storeOld.personas).length : 0;
  console.log(`Sync Query Generation: 
    ${incomingPersonas} Incoming Personas,
    ${existingPersonas} Existing Personas,
Sync Process Identified:
    ${declareQueries.length} Persona Declaration Relationships,
    ${newPersonas} New Personas,
    ${newRels} New Relationships,
    ${updatedPersonas} Updated Personas,
    ${updatedRels} Updated Relationships,
    ${undeclaredPersonas} Undeclared Personas,
    ${undeclaredRels} Undeclared Relationships`);

  // process persona, then relationship, then declare queries
  const queries = personaQueries.concat(controlQueries).concat(declareQueries);

  return queries;
}

/**
 * Create or get a persona in the store
 * @private
 */
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

/**
 * Add a single persona to the store
 * @private
 */
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

const getDeclareQuery = (sid, upn) => {
  return {
    query: `MATCH (source:Source { sid: $sid }), (persona:Persona { upn: $upn })
  MERGE (source)-[rel:DECLARE]->(persona)
  `,
    values: {
      sid,
      upn
    }
  }
}

const getControlQuery = (sid, controlUpn, obeyUpn, relProps) => {
  relProps.sid = sid;
  return {
    query: `MATCH (control:Persona { upn: $controlUpn }), (obey:Persona { upn: $obeyUpn })
    MERGE (control)-[rel:CONTROL { sid: $relProps.sid }]->(obey)
    SET rel += $relProps
    `,
    values: {
      controlUpn: controlUpn,
      obeyUpn: obeyUpn,
      relProps: relProps,
    }
  }
}

const getPersonaQuery = (personaNew, personaOld) => {
  const query = `MERGE (persona:Persona { upn: $upn })
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
        if(!personaOld || personaNew[prop] !== personaOld[prop]) {
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

const getSyncControlQueries = (sid, personaNew, personaOld) => {
  let queries = [];

  if(personaOld) {
    // create an array of upns in the old persona that are not in the new persona
    const controlRelOldUpns = Object.keys(personaOld.control).filter((upn) => !personaNew.control[upn]);
    for(const controlRelOldUpn of controlRelOldUpns) {
      queries.push(getRemoveControlQuery(sid, personaNew.upn, controlRelOldUpn));
    }
  }

  for(const obeyUpn in personaNew.control) {
    const controlRelNew = personaNew.control[obeyUpn];
    const controlRelOld = personaOld?.control[obeyUpn];

    if(!controlRelOld) {
      queries.push(getControlQuery(sid, personaNew.upn, obeyUpn, controlRelNew));
    } else {
      const relProps = {};
      for(const prop in controlRelNew) {
        if(prop === "sid") { continue; }
        if(controlRelNew[prop] !== controlRelOld[prop]) {
          relProps[prop] = controlRelNew[prop];
        }
      }
      for(const prop in controlRelOld) {
        if(prop === "sid") { continue; }
        if(controlRelNew[prop] === undefined) {
          relProps[prop] = null;
        }
      }
      if(Object.keys(relProps).length > 0) {
        queries.push(getControlQuery(sid, personaNew.upn, obeyUpn, relProps));
      }
    }
  }
  return queries;
}

/**
 * Get a query set to remove a persona declaration
 * 
 * @param {string} sid
 * @param {string} upn
 * @returns {object} - The query set object
 */
const getUndeclarePersonaQuery = (sid, upn) => {
  const query = `MATCH (source:Source { sid: $sid })-[rel:DECLARE]->(persona:Persona { upn: $upn })
    DELETE rel
    `
  return {query, values: {sid, upn}};
}

/**
 * Get a query set to remove a control relationship
 * 
 * @param {string} sid
 * @param {string} upn
 * @returns {object} - The query set object
 */
const getUndeclareControlQuery = (sid, upn) => {
  const query = `MATCH (persona:Persona { upn: $upn })-[rel:CONTROL]-(:Persona)
    WHERE rel.sid = $sid
    AND persona.upn = $upn
    DELETE rel
    `
  return {query, values: {sid, upn}};
}

/**
 * Get a query set to remove a control relationship
 * 
 * @param {string} sid 
 * @param {string} controlUpn 
 * @param {string} obeyUpn 
 * @returns {object} - The query set object
 */
const getRemoveControlQuery = (sid, controlUpn, obeyUpn) => {
  const query = `MATCH (control:Persona { upn: $controlUpn })-[rel:CONTROL]->(obey:Persona { upn: $obeyUpn })
    WHERE rel.sid = $sid
    DELETE rel
    `
  return {query, values: {sid, controlUpn, obeyUpn}};
}

export default {
  newStore,
  addPersonas,
  addRelationships,
  getSyncQueries,
}