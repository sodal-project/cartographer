const CC = require('./constants');

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

const idString = (id) => {
  if(!id) {
    throw Error('ID is empty');
  }
  return true;
}

const sourceId = (id) => {
  if(!id) {
    throw Error('ID is empty');
  }
  const sourceString = id.split(':')[0];
  if(sourceString !== 'source') {
    throw Error('ID string invalid: Does not start with "source:"');
  }
  const sourceType = id.split(':')[1];
  if(!sourceType) {
    throw Error('Source type is empty');
  }
  const sourceId = id.split(':')[2];
  if(!sourceId) {
    throw Error('Source ID is empty');
  }
  return true;
}

const typeString = (type) => {
  if(!type) {
    throw Error('TYPE is empty');
  }
  return true;
}

const platformString = (platform) => {
  if(!platform) {
    throw Error('PLATFORM is empty');
  }
  return true;
}

const simpleValue = (property) => {
  try {
    if(property !== undefined){
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
          case 'sourceId':
            sourceId(relationship[prop]);
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

const sourceObject = (source) => {
  try {
    if(!source) {
      throw Error('Source object is empty');
    }
    if(!source.id) {
      throw Error('Source ID is not set');
    }
    if(!source.name) {
      throw Error('Source name is not set');
    }
    for(const prop in source) {
      switch(prop) {
        case 'id':
          sourceId(source[prop]);
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
  sourceId,
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