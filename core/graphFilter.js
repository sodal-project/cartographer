const connector = require('./graphNeo4jConnector');
const CC = require('./constants');

/* 
sort: {
  field: string
  direction: ASC | DESC
}

filter: [
  {
    type: field
    key: string
    value: string
    operator: string
    not: boolean
  },
  {
    type: source
    key: id | name | lastUpdate
    value: string
    operator: string
    not: boolean
  },
  {
    type: agency
    key: control | obey
    filter: [ ... ]
    levels: number[]
    confidence: {
      min: number
      max: number
    }
  },
  {
    type: compare,
    key: in, not, or
    filter: [ ... ]
  },
  {
    type: set
    upns: string[] // array of upns
  }
]
*/

// Operators for filtering
const operators = {
  "=": "=",
  ">": ">",
  "gt": ">",
  "<": "<",
  "lt": "<",
  ">=": ">=",
  "gte": ">=",
  "<=": "<=",
  "lte": "<=",
  "≠": "<>",
  "ne": "<>",
  "<>": "<>",
  "is": "=",
  "equals": "=",
  "contains": "CONTAINS",
  "starts": "STARTS WITH",
  "startswith": "STARTS WITH",
  "startsWith": "STARTS WITH",
  "ends": "ENDS WITH",
  "endswith": "ENDS WITH",
  "endsWith": "ENDS WITH",
}

/**
 * @description Filter the graph database based on the provided filter object
 * 
 * This is the entry point for the graph filter. 
 * It takes a filter object and returns an array of personas that match the filter.
 * 
 * @param {object} filter - The filter object
 * @param {object} sort - The sort object
 * @returns {object[]} - The query results
 */
async function graphFilter (filter, sort = { field: "upn", direction: "ASC"}) {

  const upns = await getUpnsFromFilter(filter);
  const sortedResults = await sortResults(upns, sort);
  return sortedResults;
}

/**
 * @description Get the upns from the filter object
 * 
 * @param {object} filter - The filter object
 * @returns {string[]} - An array of upns
 */
async function getUpnsFromFilter (filter) {

  const setArray = [];
  const fieldArray = [];
  const sourceArray = [];
  const agencyArray = [];
  const compareArray = [];

  // Loop through the filter object and build arrays of the filters to call
  for(const key in filter) {
    const type = filter[key].type;

    if(type === 'field') {
      fieldArray.push(filter[key]);
    } else if(type === 'source') {
      sourceArray.push(filter[key]);
    } else if(type === 'agency') {
      agencyArray.push(filter[key]);
    } else if(type === 'compare') {
      compareArray.push(filter[key]);
    } else if(type === 'set') {
      setArray.push(filter[key]);
    }
  }

  let upns = await getUpnsByFieldArray(fieldArray);

  if(setArray.length > 0) {
    upns = await getUpnsBySetArray(setArray, upns);
  }
  if(sourceArray.length > 0) {
    upns = await getUpnsBySourceArray(sourceArray, upns);
  }
  for(const agency of agencyArray) {
    upns = await getUpnsByAgency(agency, upns);
  }
  for(const compare of compareArray) {
    upns = await getUpnsByCompare(compare, upns);
  }

  return upns;
}

async function getUpnsByFieldArray (fieldArray) {
  let query = `MATCH (persona:Persona)\n`
  let firstQuery = true;

  for(const field in fieldArray) {
    if(firstQuery) {
      firstQuery = false;
      query += `WHERE `;
    } else {
      query += `AND `;
    }

    const filter = fieldArray[field];
    const operator = operators[filter.operator];
    const fieldKey = filter.key;
    const fieldValue = filter.value;
    const modifier = filter.not ? "NOT " : "";

    if(!operator || !fieldKey || !fieldValue) {
      throw new Error('Invalid filter');
    }

    query += `${modifier}persona.${fieldKey} ${operator} "${fieldValue}"\n`;
  }
  query += `RETURN DISTINCT persona.upn`;
  return await readSingleArray(query);
}

async function getUpnsBySetArray (setArray, upns) {
  // identify only the upns that are in all sets
  for(const set in setArray) {
    const upnsInSet = setArray[set].upns;
    upns = upns.filter(upn => upnsInSet.includes(upn));
  }
  return upns;
}

async function getUpnsBySourceArray (sourceArray, upns) {
  let query = `MATCH (source:Source)-[:DECLARE]->(persona:Persona)
  WHERE persona.upn IN $upns\n`;

  for(const source in sourceArray) {
    const filter = sourceArray[source];

    query += `AND `;

    const operator = operators[filter.operator];
    const fieldKey = filter.key;
    const fieldValue = filter.value;
    const modifier = filter.not ? "NOT " : "";

    if(!operator || !fieldKey || !fieldValue) {
      throw new Error('Invalid source filter');
    } else if(fieldKey !== 'name' && fieldKey !== 'id' && fieldKey !== 'lastUpdate') {
      throw new Error('Invalid source filter key (must be name, id, or lastUpdate)');
    }

    query += `${modifier}source.${fieldKey} ${operator} "${fieldValue}"\n`;
  }
  query += `RETURN DISTINCT persona.upn`;
  return await readSingleArray(query, { upns });
}

async function getUpnsByAgency (agency, upns) {

  const direction = agency.key;
  const filter = agency.filter;
  const levels = [];
  const confidence = agency.confidence || { min: 0, max: 1 };
  const filterUpns = await getUpnsFromFilter(filter);

  confidence.min = parseFloat(confidence.min);
  confidence.max = parseFloat(confidence.max);
  if(confidence.min > confidence.max || confidence.min < 0 || confidence.max > 1) {
    throw new Error('Invalid confidence range');
  }

  for(const level of agency.levels) {
    levels.push(CC.LEVEL[level]);
  }

  let indexUpnString = "";
  let filterUpnString = "";

  if(direction === 'control') {
    indexUpnString = "control.upn"
    filterUpnString = "obey.upn"
  } else if(direction === 'obey') {
    indexUpnString = "obey.upn"
    filterUpnString = "control.upn"
  } else {
    throw new Error('Invalid agency direction (must be control or obey)');
  }

  // Find all nonredundant paths between the control and obey personas
  let query = `MATCH SHORTEST 1 ((control:Persona) (()-[rList:CONTROL]->())+ (obey:Persona))\n`;

  // Filter control and obey personas based on the control direction
  query += `WHERE ${indexUpnString} IN $upns AND ${filterUpnString} IN $filterUpns\n`;

  // Filter control relationships based on the levels and confidence
  query += `WITH control,obey,[r IN rList | r.level ] AS relLevels, [r IN rList | r.confidence ] AS relConfidences
  WHERE ALL(level IN relLevels WHERE level IN $levels)\n`;

  // Omit the confidence filter if the confidence is full range
  if(confidence.min > 0 || confidence.max < 1) {
    query += `AND ALL(confidence IN relConfidences WHERE confidence >= $confidence.min AND confidence <= $confidence.max)\n`;
  }
  query += `RETURN DISTINCT ${indexUpnString}`;

  const params = {
    upns,
    filterUpns,
    levels,
    confidence
  }
  return await readSingleArray(query, params);
}

async function getUpnsByCompare (compare, upns) {

  const action = compare.key;
  const filter = compare.filter;

  const subfilterUpns = await getUpnsFromFilter(filter);

  if(action === 'in') {
    upns = upns.filter(upn => subfilterUpns.includes(upn));
  } else if(filter === 'not') {
    upns = upns.filter(upn => !subfilterUpns.includes(upn));
  } else if(filter === 'or') {
    upns = [...new Set([...upns, ...subfilterUpns])];
  }

  return upns;
}

async function readSingleArray (query, params) {
  // console.log(`--- Running query:\n ${query}`);
  const results = await connector.runRawQuery(query, params);
  const array = results.records.map(node => node._fields[0]);
  // console.log(`--- Found ${array.length} upns...`);
  return array;
}

async function sortResults (upns, sort) {
  let query = `MATCH (persona:Persona) WHERE persona.upn IN $upns\n`;
  query += `RETURN DISTINCT persona ORDER BY persona.${sort.field} ${sort.direction}`;

  const results = await connector.runRawQuery(query, { upns });
  return results;
}

module.exports = graphFilter;