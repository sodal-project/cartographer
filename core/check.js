const CC = require('./constants');

/**
 * Test if an object is a valid persona
 * 
 * @param {object} persona 
 * @throws {Error} - If the persona object is invalid
 * @returns {boolean} - True if the persona object is valid
 */
const personaObject = (persona) => {
  try {
    if(!persona) { 
      throw Error('Persona object is empty');
    }
    // validate upn alignment
    const upn = persona.upn;
    upnString(upn);
    if(upn.split(':')[1] !== persona.platform) {
      throw Error('Platform does not match UPN');
    }
    if(upn.split(':')[2] !== persona.type) {
      throw Error('Type does not match UPN');
    }
    if(upn.split(':')[3] !== persona.id) {
      throw Error('ID does not match UPN');
    }
    for(const prop in persona) {
      const value = persona[prop];
      switch(prop) {
        case 'upn':
        case 'platform':
        case 'type':
        case 'id':
          break;
        case 'control':
        case 'obey':
          personaRelsArray(upn, value);
          break;
        default:
          simpleValue(value);
          break;
      }
    }
  } catch(error) {
    console.error(persona);
    throw Error('Error checking persona object: \n' + error);
  }

  return true;
}

/**
 * Test if a string is a valid UPN
 * 
 * @param {string} upn 
 * @throws {Error} - If the UPN string is invalid
 * @returns {boolean} - True if the UPN string is valid 
 */
const upnString = (upn) => {
  try {
    if(!upn) { 
      throw Error('UPN is empty');
    }
  
    if(upn.split(':')[0] !== 'upn') {
      throw Error('UPN string invalid: Does not start with "upn:"');
    }
    platformString(upn.split(':')[1]);
    typeString(upn.split(':')[2]);
    idString(upn.split(':')[3]);

  } catch (error) {
    console.error(upn);
    throw Error('Error checking UPN string: \n' + error);
  }
  return true;
}

/**
 * Test if a string is a valid persona ID
 * 
 * @param {string} id 
 * @throws {Error} - If the ID string is invalid
 * @returns {boolean} - True if the ID string is valid
 */
const idString = (id) => {
  if(!id) {
    throw Error('ID is empty');
  }
  return true;
}

/**
 * Test if a string is a valid source ID (source:<type>:<instanceId>)
 * 
 * @param {string} sid 
 * @throws {Error} - If the source ID string is invalid
 * @returns {boolean} - True if the source ID string is valid
 */
const sidString = (sid) => {
  if(!sid) {
    throw Error('Source ID is empty');
  }
  const sourceString = sid.split(':')[0];
  if(sourceString !== 'source') {
    throw Error('ID string invalid: Does not start with "source:"');
  }
  const sourceType = sid.split(':')[1];
  if(!sourceType) {
    throw Error('Source type is empty');
  }
  const instanceId = sid.split(':')[2];
  if(!instanceId) {
    throw Error('Source Instance ID is empty');
  }
  return true;
}

/**
 * Test if a persona type string is valid
 * 
 * @param {string} type 
 * @throws {Error} - If the type string is invalid
 * @returns {boolean} - True if the type string is valid
 */

const typeString = (type) => {
  if(!type) {
    throw Error('TYPE is empty');
  }
  return true;
}

/**
 * Test if a platform string is valid
 * 
 * @param {string} platform 
 * @throws {Error} - If the platform string is invalid
 * @returns {boolean} - True if the platform string is valid
 */
const platformString = (platform) => {
  if(!platform) {
    throw Error('PLATFORM is empty');
  }
  return true;
}

/**
 * Test if a persona custom property is a simple value (string, number, or boolean)
 * 
 * @param {*} property 
 * @throws {Error} - If the property is not a string, number, or boolean
 * @returns {boolean} - True if the property is a simple value 
 */
const simpleValue = (property) => {
  try {
    if(property !== undefined && property !== null) {
      switch(typeof property) {
        case 'string':
        case 'number':
        case 'boolean':
          break;
        default:
          throw Error(`Persona property is not a string, number, or boolean.\nTypeof: ${typeof property}\nProperty: ${property}`);
      }
    }
  } catch (error) {
    console.error(property);
    throw Error('Error checking persona property: \n' + error);
  }
  return true;
}

/**
 * Test if a persona's internal control or obey relationship array is valid
 * 
 * A valid internal relationship array is an array of objects with the following properties:
 * {
 *  upn: string,
 *  level: number,
 *  confidence: number,
 *  sid: string,
 * }
 * 
 * @param {string} upn 
 * @param {array} relArray 
 * @throws {Error} - If the relationship array is invalid
 * @returns {boolean} - True if the relationship array is valid
 */
const personaRelsArray = (upn, relArray) => {
  try {
    if(!relArray) {
      throw Error('Relationship array is not set');
    }
    for(const relationship of relArray) {
      upnString(relationship.upn);
      if(relationship.upn === upn) {
        throw Error('Control object UPN matches persona UPN');
      }
      levelNumber(relationship.level);
      confidenceNumber(relationship.confidence);
      for(const prop in relationship) {
        switch(prop) {
          case 'upn':
          case 'level':
          case 'confidence':
            break;
          case 'sid':
            sidString(relationship[prop]);
            break;
          default:
            simpleValue(relationship[prop]);
            break;
        }
      }
    }
  } catch (error) {
    console.error(upn);
    throw Error('Error checking persona relationship array: \n' + error);
  }
}

/**
 * Test if a relationship object is valid
 * 
 * A valid relationship object has the following properties:
 * {
 *   controlUpn: string,
 *   obeyUpn: string,
 *   level: number,
 *   confidence: number,
 *   ... <custom simple properties>
 * }
 * 
 * @param {object} relationship 
 * @throws {Error} - If the relationship object is invalid
 * @returns {boolean} - True if the relationship object is valid
 */
const relationshipObject = (relationship) => {
  try {
    if(!relationship) {
      throw Error('Relationship object is empty');
    }
    upnString(relationship.controlUpn);
    upnString(relationship.obeyUpn);
    levelNumber(relationship.level);
    confidenceNumber(relationship.confidence);
    for(const prop in relationship) {
      switch(prop) {
        case 'controlUpn':
        case 'obeyUpn':
        case 'level':
        case 'confidence':
          break;
        default:
          simpleValue(relationship[prop]);
          break;
      }
    }
  } catch (error) {
    console.error(relationship);
    throw Error('Error checking relationship object: \n' + error);
  }
}

/**
 * Test if a source store object is valid
 * 
 * A valid source store object has the following properties:
 * {
 *  source: <valid source object>
 *  personas: <object of upn:persona source store modified perons objects>,
 * }
 * 
 * @param {object} store 
 */
const sourceStoreObject = (store) => {
  try {
    if(!store) {
      throw Error('Source store object is empty');
    }
    sourceObject(store.source);

    if(!store.personas) {
      throw Error('Personas object is not set');
    }
    for(const upn in store.personas) {
      sourceStoreModifiedPersonaObject(store.personas[upn]);
    }

  } catch (error) {
    throw Error('Error checking source store object: \n' + error);
  }
}

/**
 * Test if a source store modified persona object is valid
 * 
 * A valid source store modified persona object has the following properties:
 * {
 *   upn: string,
 *   platform: string,
 *   type: string,
 *   id: string,
 *   control: <object of upn:relationship source store modified relationship objects>,
 * }
 * 
 * @param {object} persona 
 * @throws {Error} - If the persona object is invalid
 * @returns {boolean} - True if the persona object is valid
 */
const sourceStoreModifiedPersonaObject = (persona) => {
  try {
    if(!persona) { 
      throw Error('Persona object is empty');
    }
    // validate upn alignment
    const upn = persona.upn;
    upnString(upn);
    if(upn.split(':')[1] !== persona.platform) {
      throw Error('Platform does not match UPN');
    }
    if(upn.split(':')[2] !== persona.type) {
      throw Error('Type does not match UPN');
    }
    if(upn.split(':')[3] !== persona.id) {
      throw Error('ID does not match UPN');
    }
    for(const prop in persona) {
      const value = persona[prop];
      switch(prop) {
        case 'upn':
        case 'platform':
        case 'type':
        case 'id':
          break;
        case 'control':
          if(value) { sourceStoreModifiedPersonaRelationshipsObject(upn, value); }
          break;
        default:
          simpleValue(value);
          break;
      }
    }
  } catch (error) {
    console.error(persona);
    throw Error('Error checking source store persona object: \n' + error);
  }
}

/**
 * Test if a source store modified persona relationships object is valid
 * This modified object contains only control relationships
 * 
 * A valid source store modified persona relationships object is an object with the following properties:
 * {
 *   upn: string,
 *   level: number,
 *   confidence: number,
 *   ... <custom simple properties>
 * }
 * @param {string} upn 
 * @param {object} relObject 
 */
const sourceStoreModifiedPersonaRelationshipsObject = (upn, relObject) => {
  try {
    if(!relObject) {
      throw Error('Relationship object is not set');
    }
    for(const relUpn in relObject) {
      upnString(relUpn);
      if(relUpn === upn) {
        throw Error('Control object UPN matches persona UPN');
      }
      const relationship = relObject[relUpn];

      levelNumber(relationship.level);
      confidenceNumber(relationship.confidence);
      for(const prop in relationship) {
        switch(prop) {
          case 'level':
          case 'confidence':
            break;
          default:
            simpleValue(relationship[prop]);
            break;
        }
      }
    }
  } catch (error) {
    console.error(upn);
    throw Error('Error checking source store persona relationship object: \n' + error);
  }
}

/**
 * Test if a source object is valid
 * 
 * @param {object} source 
 * @throws {Error} - If the source object is invalid
 * @returns {boolean} - True if the source object is valid 
 */
const sourceObject = (source) => {
  try {
    if(!source) {
      throw Error('Source object is empty');
    }
    if(!source.sid) {
      throw Error('Source ID is not set');
    }
    if(!source.name) {
      throw Error('Source name is not set');
    }
    for(const prop in source) {
      switch(prop) {
        case 'id':
          sidString(source[prop]);
          break;
        default:
          simpleValue(source[prop]);
          break;
      }
    }
  } catch (error) {
    console.error(source);
    throw Error('Error checking source object: \n' + error);
  }
  return true;
}

/**
 * Test if a number is a valid level number (integer from 1 and 12)
 * 
 * @param {number} level 
 * @throws {Error} - If the level number is invalid
 * @returns {boolean} - True if the level number is valid 
 */
const levelNumber = (level) => {
  if(!level) {
    throw Error('Level is empty');
  }
  const levelValues = Object.values(CC.LEVEL);
  if(!levelValues.includes(level)) {
    throw Error('Level is not a valid level');
  }
  return true;
}

/**
 * Test if a number is a valid confidence number (float from 0 to 1)
 * 
 * @param {number} confidence 
 * @throws {Error} - If the confidence number is invalid
 * @returns {boolean} - True if the confidence number is valid 
 */
const confidenceNumber = (confidence) => {
  if(!confidence) {
    throw Error('Confidence is not set');
  }
  if(confidence < 0 || confidence > 1) {
    throw Error('Confidence must be between 0 and 1, currently set to ' + confidence);
  }
  return true;
}

module.exports = {
  personaObject,
  upnString,
  idString,
  sidString,
  typeString,
  platformString,
  simpleValue,
  personaRelsArray,
  relationshipObject,
  sourceStoreObject,
  sourceObject,
  levelNumber,
  confidenceNumber,
}