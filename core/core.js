const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { MongoClient } = require('mongodb');

/**
 * ------------------------------------------------
 * Private Functions
 * ------------------------------------------------
 */
function addPersonaToDatabase() {
  log('persona added to database', 'INFO');
  return { value: 'persona added to database' };
}

/**
 * Get Calling Folder
 * Check the stack trace to determine the calling folder.
 * 
 * @param {string} stack - The stack trace from an Error object
 * @returns {string} The name of the calling folder
 */ 
function utilGetCallingFolder(stack) {
  const callerFile = stack.split('\n')[2].trim().match(/\((.*):\d+:\d+\)/)[1];
  const folderName = path.basename(path.dirname(callerFile));
  return folderName;
}

/**
 * Get Formatted data
 * Return the current date and time in the format MM-DD-YYYY_HH:MM:SS
 * 
 * @returns {string} The current data in the format MM-DD-YYYY_HH:MM:SS
 */ 
function getFormattedDate() {
  const date = new Date();
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${month}-${day}-${year}_${hours}:${minutes}:${seconds}`;
}

/**
 * Read from MongoDB
 * Function to read an object from MongoDB
 */
async function getDataFromDatabase(namespace) {
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
      console.log(`No data found for namespace: ${namespace}`);
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
 * Write to MongoDB
 * Function to write an object to MongoDB
 */
async function writeToMongoDB(namespace, data) {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;
  const collectionName = process.env.MONGO_COLLECTION_NAME;
  const client = new MongoClient(uri); // Remove deprecated options

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Prepare the document structure
    const updateDoc = { 
      $set: {
        [namespace]: data // Use dynamic object key for the namespace
      }
    };

    // Update the document, inserting the namespace object if it doesn't exist
    const result = await collection.updateOne(
      { _id: "namespace-config" },  // Document to update (you can adjust this _id)
      updateDoc,
      { upsert: true }               // Create the document if it doesn't exist
    );

    console.log(`Updated document with _id: ${result.upsertedId || 'namespace-config'}`);
  } catch (err) {
    console.error(`Failed to update document: ${err}`);
  } finally {
    await client.close();
  }
}


/**
 * ------------------------------------------------
 * Public Functions
 * ------------------------------------------------
 */

/**
 * Log
 * @description Log a message to a file
 * @param {string} message - The message to log
 */
function log(message, type='UNKNOWN_TYPE') {
  // Create log message
  const timestamp = getFormattedDate();
  const moduleName = utilGetCallingFolder(new Error().stack);
  const authLevel = `AUTH_0`;
  const logMessage = `${timestamp}, ${moduleName}, ${message}, ${type}, ${authLevel}`;

  // Define log file path
  const logsDir = path.join(process.cwd(), 'logs');
  const logFilePath = path.join(logsDir, 'log.csv');

  // Ensure the logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  // Check if the log file exists
  const fileExists = fs.existsSync(logFilePath);

  // If the file doesn't exist, create it and add the header row
  if (!fileExists) {
    const header = 'timestamp, module, message, type, authorization\n';
    fs.writeFileSync(logFilePath, header, 'utf8');
  }

  // Append the log message to log.csv
  fs.appendFileSync(logFilePath, `${logMessage}\n`, 'utf8');

  // Log the message to the console
  console.log(logMessage);
}

/**
 * Write Config
 * 
 * @param {object} data - The data to write to the config file
 */
async function writeConfig() {
  const moduleName = utilGetCallingFolder(new Error().stack);
  const data = {
    name: 'Example3',
    age: 30,
    profession: 'Developer',
    location: 'San Francisco'
  };

  try {
    await writeToMongoDB(moduleName, data);
  } catch (err) {
    console.error(`Error in writeConfig: ${err}`);
  }
}

function savePersona() {
  return addPersonaToDatabase();
}

async function getData() {
  const moduleName = utilGetCallingFolder(new Error().stack);
  const data = await getDataFromDatabase(moduleName);
  return data;
}

module.exports = {
  log,
  savePersona,
  getData,
  writeConfig
};
