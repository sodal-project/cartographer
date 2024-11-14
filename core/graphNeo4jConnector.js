require('dotenv').config();
const neo4j = require('neo4j-driver');
const cache = require('./cache.js');

const Config = {
  db_host: `bolt://${process.env.INSTANCE_NAME_DB}:${process.env.NEO4J_BOLT_PORT}`,
  db_username: process.env.NEO4J_USERNAME,
  db_password: process.env.NEO4J_PASSWORD,
  healthCheck: false,
}

const HealthQueries = {
  "getCount": "MATCH (n) RETURN count(n) as count",
  "setConstraintUPN": "CREATE CONSTRAINT constraint_upn IF NOT EXISTS FOR (p:Persona) REQUIRE p.upn IS UNIQUE",
  "setConstraintSource": "CREATE CONSTRAINT constraint_source IF NOT EXISTS FOR (s:Source) REQUIRE s.id IS UNIQUE",
  "setIndexType": "CREATE INDEX index_persona_type IF NOT EXISTS FOR (n:Persona) ON (n.type)",
  "setIndexPlatform": "CREATE INDEX index_persona_platform IF NOT EXISTS FOR (n:Persona) ON (n.platform)",
}

/**
 * Verify that the database is connected and healthy
 * 
 * On first run, this function will set the healthCheck flag
 * and create the necessary constraints and indexes in the database
 * 
 * @returns {boolean} - True if the database is connected and healthy
 */
const healthCheck = async () => {
  if(Config.healthCheck) {
    return true;
  } else {
    let driver, session;
    try {

      // connect to the default database with the admin login
      console.log('Health Check: CHECK - connecting to the database');
      driver = neo4j.driver(Config.db_host, neo4j.auth.basic(Config.db_username, Config.db_password));
      session = driver.session();

      // verify that the database is connected
      const result = await session.run(HealthQueries.getCount);
      const count = result.records[0].get('count');
      console.log(`Health Check: OK - Connected, ${count} nodes in the database`);

      // verify that indexes and constraints are set
      console.log('Health Check: CHECK - setting constraints and indexes on the database');
      await session.run(HealthQueries.setConstraintUPN);
      await session.run(HealthQueries.setConstraintSource);
      await session.run(HealthQueries.setIndexType);
      await session.run(HealthQueries.setIndexPlatform);
      console.log('Health Check: OK - Constraints and Indexes are set on the database');

      // return true if all checks pass
      Config.healthCheck = true;
      return true;
    } catch (error) {
      console.error('Health Check error:', error);
      return false;
    } finally {
      await session.close();
      await driver.close();
    }
  }
}

/**
 * Executes a single query against the database
 * 
 * @param {string} query - cypher query to execute
 * @param {object} optionalParams 
 * @returns {object} - The response from the database
 */
const runRawQuery = async (query, optionalParams, doCache) => {
  if(doCache){
    await saveCache('querySingle', {query, optionalParams});
  }

  if(!(await healthCheck())) {
    console.error('Health Check failed, unable to process raw query.');
    return false;
  } else {
    // console.log('Health Check passed, processing raw query with params:', Object.keys(optionalParams));
  }

  const driver = neo4j.driver(Config.db_host, neo4j.auth.basic(Config.db_username, Config.db_password));
  const session = driver.session();

  try {
    const result = await session.run(query, optionalParams);

    // log notifications
    if(result.summary.notifications.length > 0) {
      console.log('Notifications:', result.summary.notifications);
    }

    if(doCache){
      await saveCache('singleResponse', result);
    }

    return result;
  } catch (error) {
    console.error('Error processing raw query:', error);
    throw error;
  } finally {
    session.close();
    driver.close();
  }
}

/**
 * Executes an array of queries in a set of transaction
 * 
 * NOTE: this is a more performant way to execute 
 * multiple queries than executing runRawQuery multiple times
 * 
 * NOTE: 
 * 
 * The queryArray is an array of objects with the following structure:
 * -- query: a string representing the cypher query to execute
 * -- values: an object containing the parameters for the query
 * 
 * Example:
 * [
 *   {
 *    query: "MATCH (n) WHERE n.type = $type RETURN n",
 *    values: { type: "account" },
 *   },
 *   {...},
 *   {...},
 * ]
 * 
 * @param {array} queryArray 
 * @returns {object} - The aggregate response from the database
 */
const runRawQueryArray = async (queryArray, doCache) => {
  if(doCache){
    await saveCache('queryArray', queryArray);
  }

  if(!(await healthCheck())) {
    console.error('Health Check failed, unable to process query array.');
    return null;
  }

  console.log('--- Process dbQueryArray with ' + queryArray.length + ' queries...');

  const driver = neo4j.driver(Config.db_host, neo4j.auth.basic(Config.db_username, Config.db_password), { encrypted: false });
  const session = driver.session();
  const startTime = performance.now();
  const transaction = session.beginTransaction();
  let response = {};

  try {
    const tPromisesArray = [];

    for(let q in queryArray){
      let curQueryObj = queryArray[q];

      let curQueryString = curQueryObj["query"];
      let curQueryValues = curQueryObj["values"];
    
      let tPromise = transaction.run(curQueryString, curQueryValues);
      tPromisesArray.push(tPromise);
    }

    console.log("All query transactions submitted, waiting for completion...");
    // wait for all transactions to finish
    await Promise.all(tPromisesArray).then(
      (results) => {
        response = results;
        console.log("--- End processing query array. Completed " + results.length + " transactions.");
      }
    );
    await transaction.commit();
    const duration = performance.now() - startTime;
    console.log(`Processed ${queryArray.length} queries in ${duration} milliseconds.`);
    if(response.summary?.notifications?.length) {
      console.log(`Notifications:\n${response.summary.notifications}`);
    } else {
      console.log('No notifications to display.');
    }
    if(doCache){
      await saveCache('arrayResponse', response);
    }

  } catch (error) {
    console.error(`Error processing query array: ${error}`);
  } finally {
    await session.close()
    await driver.close()
  }
  return response;
}

const saveCache = async (type, data) => {
  const unixTime = Math.floor(Date.now() / 1000);
  await cache.save(`graph-${unixTime}`, type, data);
}

module.exports = {
  runRawQueryArray,
  runRawQuery
}