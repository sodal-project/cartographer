require('dotenv').config();
const { consoleLog } = require('./log.js');
const { MongoClient } = require('mongodb');

/**
 * MONGO CRUD FUNCTIONS
 * Functions to write, read and delete data from namespaces in MongoDB.
 */

/**
 * readFromMongo
 * Read a namespace from MongoDB
 * 
 * @param {string} namespace - The namespace to read from
 */
async function readFromMongo(namespace) {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;
  const collectionName = process.env.MONGO_COLLECTION_NAME;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Query for the document and retrieve the namespace data
    const document = await collection.findOne({ _id: "namespace-config" });

    if (document && document[namespace]) {
      // Return the data from the specified namespace
      return document[namespace];
    } else {
      consoleLog(`No data found for namespace: ${namespace}`);
      return null;
    }
  } catch (err) {
    console.error(`Failed to retrieve data from database: ${err}`);
    return null;
  } finally {
    await client.close();
  }
}

/**
 * writeToMongo
 * Write a property to a namespace in MongoDB
 * 
 * @param {string} namespace - The namespace to write to
 * @param {object} data - The data to write to the namespace
 */
async function writeToMongo(namespace, data) {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;
  const collectionName = process.env.MONGO_COLLECTION_NAME;
  const client = new MongoClient(uri); 

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Fetch the current namespace data if it exists
    const document = await collection.findOne({ _id: "namespace-config" });

    // Extract the existing namespace data if available, or set to an empty object
    const existingNamespaceData = document && document[namespace] ? document[namespace] : {};

    // Merge new data with existing data, ensuring unique properties are added
    const mergedData = { ...existingNamespaceData, ...data };

    // Prepare the update document
    const updateDoc = { 
      $set: {
        [namespace]: mergedData // Merge data into the namespace
      }
    };

    // Update the document, inserting the namespace object if it doesn't exist
    const result = await collection.updateOne(
      { _id: "namespace-config" },  // Document to update (you can adjust this _id)
      updateDoc,
      { upsert: true }               // Create the document if it doesn't exist
    );

    consoleLog(`Updated document with _id: ${result.upsertedId || 'namespace-config'}`);
    
    // Return the result of the update operation (true if successful)
    return result.acknowledged;
  } catch (err) {
    console.error(`Failed to update document: ${err}`);
  } finally {
    await client.close();
  }
}

/**
 * deleteFromMongo
 * Delete a property from a namespace in MongoDB
 * 
 * @param {string} namespace - The namespace to delete from
 * @param {string} property - The property to delete
 */
async function deleteFromMongo(namespace, property) {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;
  const collectionName = process.env.MONGO_COLLECTION_NAME;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Prepare the document structure with the property to delete
    const updateDoc = {
      $unset: {
        [`${namespace}.${property}`]: "" // Specify the property to remove
      }
    };

    // Update the document, removing the specific key from the namespace
    const result = await collection.updateOne(
      { _id: "namespace-config" },  // Document to update
      updateDoc
    );

    if (result.modifiedCount > 0) {
      consoleLog(`Deleted property '${property}' from namespace '${namespace}'`);
      return true;
    } else {
      consoleLog(`No changes made. Either property '${property}' not found or document doesn't exist.`);
    }
    return false;
  } catch (err) {
    console.error(`Failed to delete property from namespace: ${err}`);
  } finally {
    await client.close();
  }
}

module.exports = {
  readFromMongo,
  writeToMongo,
  deleteFromMongo,
};
