const CC = require('./constants');
const check = require('./check');

/**
 * Create a valid UPN string from a platform, type, and id
 * 
 * @param {string} platform 
 * @param {string} type 
 * @param {string} id 
 * @returns {string} - The generated UPN string
 * @throws {Error} - If the generated UPN string is invalid
 */
const generateUpnRaw = (platform, type, id) => {
  const newUpn = "upn:" + platform + ":" + type + ":" + id;
  check.upnString(newUpn);
  return newUpn;
}

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
 * 
 * @param {object} persona 
 * @returns {object} - The simple properties of the persona object
 * @throws {Error} - If the persona object is invalid
 */
const getProps = (persona) => {
  if(!persona) { return null; }

  const props = {...persona};
  delete props.control;
  delete props.obey;

  return props;
}

/**
 * Get the relationships of a persona object as a Relationship object array
 * 
 * @param {object} persona 
 * @returns {object[]} - An array of relationship objects
 * @throws {Error} - If the persona object is invalid
 */
const getRelationships = (persona) => {
  if(!persona) { return null; }
  
  try {
    check.personaObject(persona);
  } catch (error) {
    console.log('Error checking persona object: \n' + error);
  }

  // loop through this persona's control and obey arrays 
  // and create new relationship objects
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
 * 
 * @param {string} email 
 * @returns {object} - A new persona object
 */
const newFromEmail = (email) => {
  return newPersona(CC.PLATFORM.EMAIL, CC.TYPE.ACCOUNT, email.toLowerCase());
}

/**
 * Create a new persona object from a UPN string
 * 
 * @param {string} upn 
 * @returns {object} - A new persona object
 */
const newFromUpn = (upn) => {

  const platform = upn.split(":")[1];
  const type = upn.split(":")[2];
  const id = upn.split(":")[3];

  return newPersona(platform, type, id);
}

/**
 * Create a new persona object
 * 
 * @param {string} platform 
 * @param {string} type 
 * @param {string} id 
 * @param {object} optionalParams 
 * @returns {object} - A new persona object
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