const CC = require('./constants');
const check = require('./check');

const generateUpnRaw = (platform, type, id) => {
  const newUpn = "upn:" + platform + ":" + type + ":" + id;
  check.upnString(newUpn);
  return newUpn;
}

//
// Public
//

const getProps = (persona) => {
  if(!persona) { return null; }

  const props = {...persona};
  delete props.control;
  delete props.obey;

  return props;
}

const getRelationships = (persona) => {
  if(!persona) { return null; }
  
  try {
    check.personaObject(persona);
  } catch (error) {
    console.log('Error checking persona object: \n' + error);
  }

  const relationships = [];

  if(!persona.control) { persona.control = []; }
  for(const rel of persona.control) {
    const newRel = {...rel};
    newRel.controlUpn = persona.upn;
    newRel.obeyUpn = rel.upn;
    delete newRel.upn;
    check.relationshipObject(newRel);
    relationships.push(newRel);
  }

  if(!persona.obey) { persona.obey = []; }
  for(const rel of persona.obey) {
    const newRel = {...rel};
    newRel.controlUpn = rel.upn;
    newRel.obeyUpn = persona.upn;
    delete newRel.upn;
    check.relationshipObject(newRel);
    relationships.push(newRel);
  }

  return relationships;
}

const list = (filter) => {
}

const merge = (source, persona, querySetOnly) => {
}

const newFromEmail = (email) => {
  return newPersona(CC.PLATFORM.EMAIL, CC.TYPE.ACCOUNT, email);
}

const newFromUpn = (upn) => {

  const platform = upn.split(":")[1];
  const type = upn.split(":")[2];
  const id = upn.split(":")[3];

  return newPersona(platform, type, id);
}

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

const read = (upn) => {

}

const remove = (sourceId, upn, querySetOnly) => {

}

module.exports = {
  getProps,
  getRelationships,
  list,
  merge,
  newFromEmail,
  newFromUpn,
  newPersona,
  read,
  remove,
}