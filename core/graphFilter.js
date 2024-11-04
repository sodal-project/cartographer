const connector = require('./graphNeo4jConnector');

async function graphFilter (filter, sort) {

  const upns = await getUpns(filter);
  const sortedResults = await sortResults(upns, sort);
  return sortedResults;
}

async function getUpns (filter) {

  // if no filters are passed, return all upns
  if(!filter) {
    return await getAllUpns();
  }

  const fieldArray = [];
  const sourceArray = [];
  const agencyArray = [];
  const compareArray = [];

  let upns = null;

  // Loop through the filter object and build arrays of the filters to call
  for(const key in filter) {
    if(key === 'field') {
      fieldArray.push(filter[key]);
    } else if(key === 'source') {
      sourceArray.push(filter[key]);
    } else if(key === 'agency') {
      agencyArray.push(filter[key]);
    } else if(key === 'compare') {
      compareArray.push(filter[key]);
    }
  }

  // call filters in order of field, source, agency, compare
  if(fieldArray.length > 0) {
    upns = await getUpnsByField(fieldArray, upns);
  }
  if(sourceArray.length > 0) {
    upns = await getUpnsBySource(sourceArray, upns);
  }
  if(agencyArray.length > 0) {
    upns = await getUpnsByAgency(agencyArray, upns);
  }
  if(compareArray.length > 0) {
    upns = await getUpnsByCompare(compareArray, upns);
  }

  return upns;
}

async function getUpnsByField (fieldArray, upns) {

}

async function getUpnsBySource (sourceArray, upns) {

}

async function getUpnsByAgency (agencyArray, upns) {

}

async function getUpnsByCompare (compareArray, upns) {

}

async function getAllUpns () {

}

async function sortResults (upns, sort) {

}

module.exports = graphFilter;