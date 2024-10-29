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
 * Merge a source store object with the graph
 * 
 * @param {object} store - The source store object
 * @returns {object} - The result of the merge queries
 */
const merge = async (store) => {
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

  const sourceId = store.source.id;
  
  await utilGraph.mergeSource(store.source);
  const storeOld = await readStore(sourceId);

  if(storeOld){
    // check that the old source data is valid
    check.sourceStoreObject(storeOld);
    if(store.source.id !== storeOld.source.id) {
      throw Error(`Cannot merge stores with different sources.`);
    }

    // create array of upns in the old store that are not in new store
    const oldUpns = Object.keys(storeOld.personas).filter((upn) => !store.personas[upn]);

    // undeclare old personas that are not in the new store
    for(const upn of oldUpns) {
      personaQueries.push(getUndeclarePersonaQuery(upn));
      controlQueries = controlQueries.concat(getUndeclareControlQuery(upn));
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
        declareQueries.push(getDeclareQuery(sourceId, upn));
      }
      else { updatedPersonas++; }
    }

    // sync the persona control relationships
    const personaControlQueries = getSyncControlQueries(sourceId, personaNew, personaOld);
    if(personaControlQueries.length > 0) {
      if(!personaOld) { newRels++; }
      else { updatedRels++; }
    }
    controlQueries = controlQueries.concat(personaControlQueries);
  }

  // Report merge statistics
  const incomingPersonas = Object.keys(store.personas).length;
  const existingPersonas = storeOld ? Object.keys(storeOld.personas).length : 0;
  console.log(`Identified: 
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

  // execute the merge queries
  if(queries.length > 0) {
    console.log(`Merge Sync with ${queries.length} queries`);
    return await utilGraph.runRawQueryArray(queries);
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
const readStore = async (sourceId) => {

  // get the source object
  const source = await utilGraph.readSource(sourceId);

  // if the source doesn't exist, return null
  if(!source) {
    console.log(`Source ${sourceId} not found`);
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

  // validate the store object
  try {
    check.sourceStoreObject(store);
  } catch (error) {
    console.error(`Error validating the source store for Source: ${sourceId}`);
    throw error;
  }

  return store;
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

const getSyncControlQueries = (sourceId, personaNew, personaOld) => {
  let queries = [];

  if(personaOld) {
    // create an array of upns in the old persona that are not in the new persona
    const controlRelOldUpns = Object.keys(personaOld.control).filter((upn) => !personaNew.control[upn]);
    for(const controlRelOldUpn of controlRelOldUpns) {
      queries.push(getRemoveControlQuery(sourceId, personaNew.upn, controlRelOldUpn));
    }
  }

  for(const obeyUpn in personaNew.control) {
    const controlRelNew = personaNew.control[obeyUpn];
    const controlRelOld = personaOld?.control[obeyUpn];

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
      if(Object.keys(relProps).length > 0) {
        queries.push(getControlQuery(sourceId, personaNew.upn, obeyUpn, relProps));
      }
    }
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