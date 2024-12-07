/**
 * @fileoverview Persona management and relationship handling
 * @module Core/persona
 */

const CC = require('./constants');
const check = require('./check');

/** @typedef {import('./types').PersonaObject} PersonaObject */
/** @typedef {import('./types').PersonaRelationship} PersonaRelationship */
/** @typedef {import('./types').PersonaPlatform} PersonaPlatform */
/** @typedef {import('./types').PersonaType} PersonaType */
/** @typedef {import('./types').ControlLevel} ControlLevel */
/** @typedef {import('./types').ControlConfidence} ControlConfidence */

/**
 * Create a valid UPN string from a platform, type, and id
 * @param {PersonaPlatform} platform 
 * @param {PersonaType} type 
 * @param {string} id 
 * @returns {string} The generated UPN string
 * @throws {Error} If the generated UPN string is invalid
 */
const generateUpnRaw = (platform, type, id) => {
  const newUpn = "upn:" + platform + ":" + type + ":" + id;
  check.upnString(newUpn);
  return newUpn;
}

/**
 * Create persona objects from relationship array
 * @param {PersonaRelationship[]} relationships
 * @returns {PersonaObject[]} Array of persona objects
 */
const getFromRelationships = (relationships) => {
  if(!relationships) { return null; }

  const personas = [];

  for(const rel of relationships) {
    const persona = newFromUpn(rel.controlUpn);
    const control = {
      upn: rel.obeyUpn,
      ...rel
    }
    delete control.controlUpn;
    delete control.obeyUpn;
    persona.control = [control];
    personas.push(persona);
    check.personaObject(persona);
  }

  return personas;
}

/**
 * Get the simple properties of a persona object (no relationships)
 * @param {PersonaObject} persona 
 * @returns {Omit<PersonaObject, 'control'|'obey'>} The simple properties
 */
const getProps = (persona) => {
  if(!persona) { return null; }

  const props = {...persona};
  delete props.control;
  delete props.obey;

  return props;
}

/**
 * Get the relationships of a persona object
 * @param {PersonaObject} persona 
 * @returns {PersonaRelationship[]} Array of relationship objects
 */
const getRelationships = (persona) => {
  if(!persona) { return null; }
  
  try {
    check.personaObject(persona);
  } catch (error) {
    console.log('Error checking persona object: \n' + error);
  }

  const relationships = [];

  if(persona.control) {
    for(const rel of persona.control) {
      const newRel = {...rel};
      newRel.controlUpn = persona.upn;
      newRel.obeyUpn = rel.upn;
      delete newRel.upn;
      check.relationshipObject(newRel);
      relationships.push(newRel);
    }
  }

  if(persona.obey) { 
    for(const rel of persona.obey) {
      const newRel = {...rel};
      newRel.controlUpn = rel.upn;
      newRel.obeyUpn = persona.upn;
      delete newRel.upn;
      check.relationshipObject(newRel);
      relationships.push(newRel);
    }
  }

  return relationships;
}

/**
 * Create a new persona object from an email address
 * @param {string} email 
 * @returns {PersonaObject} A new persona object
 */
const newFromEmail = (email) => {
  return newPersona(CC.PLATFORM.EMAIL, CC.TYPE.ACCOUNT, email.toLowerCase());
}

/**
 * Create a new persona object from a UPN string
 * @param {string} upn 
 * @returns {PersonaObject} A new persona object
 */
const newFromUpn = (upn) => {
  const platform = upn.split(":")[1];
  const type = upn.split(":")[2];
  const id = upn.split(":")[3];

  return newPersona(platform, type, id);
}

/**
 * Create a new persona object
 * @param {PersonaPlatform} platform 
 * @param {PersonaType} type 
 * @param {string} id 
 * @param {Partial<PersonaObject>} [optionalParams] 
 * @returns {PersonaObject} A new persona object
 */
const newPersona = (platform, type, id, optionalParams) => {
  if(!platform || !type || !id) { return null; }

  let persona = {
    upn: generateUpnRaw(platform, type, id),
    platform: platform,
    type: type,
    id: String(id),
    obey: [],
    control: [],
  };

  if(optionalParams) {
    persona = {...persona, ...optionalParams};
  }

  check.personaObject(persona);
  return persona;
}

module.exports = {
  getFromRelationships,
  getProps,
  getRelationships,
  newFromEmail,
  newFromUpn,
  newPersona,
}