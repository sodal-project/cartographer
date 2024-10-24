require('dotenv').config();
const neo4j = require('neo4j-driver');

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

const healthCheck = async () => {
  if(Config.healthCheck) {
    return true;
  } else {
    let driver = null;
    let session = null;

    try {
      // connect to the default database with the admin login
      console.log('Health Check: CHECK - connecting to the database');
      driver = neo4j.driver(Config.db_host, neo4j.auth.basic(Config.db_username, Config.db_password));
      session = driver.session();
      let result = await session.run(HealthQueries.getCount);
      let count = result.records[0].get('count');
      console.log(`Health Check: OK - Connected, ${count} nodes in the database`);

      // verify that indexes and constraints are set
      console.log('Health Check: CHECK - setting constraints and indexes on the database');
      await session.run(HealthQueries.setConstraintUPN);
      await session.run(HealthQueries.setConstraintSource);
      await session.run(HealthQueries.setIndexType);
      await session.run(HealthQueries.setIndexPlatform);
      console.log('Health Check: OK - Constraints and Indexes are set on the database');

      // return true if all checks pass
      await session.close();
      await driver.close();
      Config.healthCheck = true;

    } catch (error) {
      console.error('Health Check error:', error);
      await session.close();
      await driver.close();
      return false;
    }
    return true;
  }
}

const runRawQuery = async (query, optionalParams) => {
  if(!(await healthCheck())) {
    console.error('Health Check failed, unable to process raw query.');
    return false;
  } else {
    console.log('Health Check passed, processing raw query with params:', Object.keys(optionalParams));
  }

  const driver = neo4j.driver(Config.db_host, neo4j.auth.basic(Config.db_username, Config.db_password));
  const session = driver.session();

  try {
    const result = await session.run(query, optionalParams);
    return result;
  } catch (error) {
    console.error('Error processing raw query:', error);
    throw error;
  } finally {
    session.close();
    driver.close();
  }
}

const runRawQueryArray = async (queryArray) => {
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

  } catch (error) {
    console.error(`Error processing query array: ${error}`);
  } finally {
    await session.close()
    await driver.close()
  }
  return response;
}

module.exports = {
  runRawQueryArray,
  runRawQuery
}