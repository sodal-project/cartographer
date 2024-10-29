const check = require('./check');

const getSourceObject = (module, type, identifier, name) => {
  let sourceId = `source:default:${module}`
  let sourceName = `${module} Default Source`;

  if(type && identifier && name) {
    sourceId = `source:${type}:${identifier}`;
    sourceName = name;
  }

  const source = {
    id: sourceId,
    name: sourceName,
  }

  check.sourceObject(source);

  return source;
}

module.exports = {
  getSourceObject,
}