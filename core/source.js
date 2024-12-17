const check = require('./check');

const getSourceObject = (module, type, identifier, name) => {
  let sid = `source:default:${module}`
  let sourceName = `${module} Default Source`;

  if(type && identifier && name) {
    sid = `source:${type}:${identifier}`;
    sourceName = name;
  }

  const source = {
    sid: sid,
    name: sourceName,
  }

  check.sourceObject(source);

  return source;
}

module.exports = {
  getSourceObject,
}