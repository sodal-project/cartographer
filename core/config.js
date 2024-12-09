/**
 * @fileoverview Persistent Module Configuration Management
 * @module Core/config
 * @description
 * Provides functions to read, write, and delete persistent configuration data for modules.
 * Data is stored in MongoDB with module-specific namespaces.
 */

import { readFromMongo, writeToMongo, deleteFromMongo } from './mongo.js';

/**
 * Read persistent module configuration data
 * 
 * @param {string} moduleName - The name of the module associated with the configuration data
 * @param {string} [optionalKey] - OPTIONAL, specific key to read from the configuration data
 * @returns {Promise<Object|any|null>} The configuration data, specific value if key provided, or null if not found
 * @example
 * // Read entire config
 * const config = await readConfig('myModule');
 * 
 * // Read specific key
 * const value = await readConfig('myModule', 'apiKey');
 */
async function readConfig(moduleName, optionalKey) {
  const data = await readFromMongo(moduleName);

  if(optionalKey && data) {
    return data[optionalKey];
  }

  return data;
}

/**
 * Write persistent module configuration data
 * 
 * @param {string} moduleName - The name of the module associated with the configuration data
 * @param {Object} data - The configuration data to write
 * @returns {Promise<Object|boolean>} The response from the database, or false if an error occurred
 * @example
 * // Write config data
 * await writeConfig('myModule', {
 *   apiKey: 'abc123',
 *   endpoint: 'https://api.example.com'
 * });
 */
async function writeConfig(moduleName, data) {
  try {
    const response = await writeToMongo(moduleName, data);
    return response;
  } catch (err) {
    console.error(`Error in writeConfig: ${err}`);
    return false;
  }
}

/**
 * Delete persistent module configuration data
 * 
 * @param {string} moduleName - The name of the module associated with the configuration data
 * @param {string} property - The property to delete from the configuration
 * @returns {Promise<Object|boolean>} The response from the database, or false if an error occurred
 * @example
 * // Delete a specific config property
 * await deleteConfig('myModule', 'apiKey');
 */
async function deleteConfig(moduleName, property) {
  try {
    const response = await deleteFromMongo(moduleName, property);
    return response;
  } catch (err) {
    console.error(`Error in deleteConfig: ${err}`);
    return false;
  }
}

export default {
  readConfig,
  writeConfig,
  deleteConfig,
};