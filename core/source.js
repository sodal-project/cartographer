/**
 * @fileoverview Source management functions
 * @module Core/source
 */

/**
 * @typedef {Object} SourceObject
 * @property {string} sid - Source identifier in format "source:<type>:<identifier>"
 * @property {string} name - Human readable name for the source
 * @property {string} [type] - Source type (e.g. 'slack', 'google')
 * @property {string} [identifier] - Platform-specific identifier
 * @property {Date} [lastUpdate] - Timestamp of last update
 */

const check = require('./check');

/**
 * Creates a source object with the given parameters
 * @param {string} module - Module name requesting the source
 * @param {string} [type] - Source type (e.g. 'slack', 'google')
 * @param {string} [identifier] - Platform-specific identifier
 * @param {string} [name] - Human readable name for the source
 * @returns {SourceObject} Source object
 */
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