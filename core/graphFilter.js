const connector = require('./graphNeo4jConnector');
const CC = require('./constants');

/* 
params: {
  field: string
  direction: ASC | DESC
  number: number
  size: number
}

filterArray: [
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
    filter: [ ... ]                  // if omitted, the filter is applied to the entire graph
    levels: number[]                 // if omitted, the filter is applied to all levels
    depth: number || [min, max]      // if omitted, the filter is applied to all depths
    confidence: {                    // if omitted, the filter is applied to all confidence levels
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

filterObject: {
  field: "<key> <operator> not value",
  source: "<key> <operator> not value", // key: id | name | lastUpdate
  agency: {
    key: control | obey,
    filter: filterObject || filterArray,
    levels: number[],
    depth: number || [min, max],
    confidence: {
      min: number,
      max: number
    }
  },
  not: filterObject || filterArray,
  or: filterObject || filterArray,
  in: filterObject || filterArray,
  set: string[] // array of upns
}

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

const allLevels = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ]

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
async function graphFilter (filter, params = {}) {

  const defaultParams = { 
    field: "upn", 
    direction: "ASC", 
    number: 1, 
    size: 500
  }
  params = { ...defaultParams, ...params };

  const upns = await getUpnsFromFilter(filter);
  const sortedResults = await sortResults(upns, params);
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

  let upns;
  if(fieldArray.length > 0) {
    upns = await getUpnsByFieldArray(fieldArray);
  }
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
    if(!upns) {
      upns = setArray[set].upns;  
    } else {
      const upnsInSet = setArray[set].upns;
      upns = upns.filter(upn => upnsInSet.includes(upn));
    }
  }
  return upns;
}

async function getUpnsBySourceArray (sourceArray, upns) {
  let query = `MATCH (source:Source)-[:DECLARE]->(persona:Persona)\n`;
  let firstQuery = true;

  for(const source in sourceArray) {
    const filter = sourceArray[source];

    if(firstQuery) {
      firstQuery = false;
      if(upns) {  
        query += `WHERE persona.upn IN $upns\nAND `;
      } else {
        query += `WHERE `;
      }
    } else {
      query += `AND `;
    }

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

  const confidence = agency.confidence || { min: 0, max: 1 };
  confidence.min = parseFloat(confidence.min);
  confidence.max = parseFloat(confidence.max);
  if(confidence.min > confidence.max || confidence.min < 0 || confidence.max > 1) {
    throw new Error('Invalid confidence range');
  }

  let levels = [];
  if(!agency.levels || agency.levels.length === 0) {
    levels = allLevels;
  } else {
    for(const level of agency.levels) {
      if(!CC.LEVEL[level]) {
        throw new Error('Invalid level');
      }
      levels.push(CC.LEVEL[level]);
    }
  }

  const filter = agency.filter;
  const filterUpns = await getUpnsFromFilter(filter);

  let indexRel = "";
  let filterRel = "";

  if(agency.key === 'control') {
    indexRel = "control"
    filterRel = "obey"
  } else if(agency.key === 'obey') {
    indexRel = "obey"
    filterRel = "control"
  } else {
    throw new Error('Invalid agency direction (must be control or obey)');
  }

  // Convert agency.depth into a Neo4j path length pattern (*min..max)
  const depth = agency.depth;
  let depthString = "*0.."; // Default: search all depths

  if (depth) {
    if (Array.isArray(depth)) {
      if (depth.length !== 2) {
        throw new Error('Depth array must contain [min, max] values');
      }
      depthString = `*${depth[0]}..${depth[1]}`; // Range: min to max depth
    } else {
      depthString = `*${parseInt(depth)}`; // Fixed depth
    }
  }

  // Find all nonredundant paths between the control and obey personas
  let query = `
  MATCH path = shortestPath((control:Persona)-[rList:CONTROL ${depthString}]->(obey:Persona))
  WHERE ${filterRel}.upn IN $filterUpns
  ${upns ? `AND ${indexRel}.upn IN $upns` : ''}
  WITH control, obey, relationships(path) as rList
  WHERE ALL(r IN rList WHERE 
    r.level IN $levels AND 
    r.confidence >= $confidence.min AND 
    r.confidence <= $confidence.max
  )\n`;

  query += `RETURN DISTINCT ${indexRel}.upn`;

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
    if(upns) {  
      upns = upns.filter(upn => subfilterUpns.includes(upn));
    } else {
      upns = subfilterUpns;
    }
  } else if(action === 'not') { 
    if(!upns) {
      upns = await getUpnsFromFilter();
    }
    upns = upns.filter(upn => !subfilterUpns.includes(upn));
  } else if(action === 'or') {  
    if(upns) {
      upns = [...new Set([...upns, ...subfilterUpns])];
    } else {
      upns = subfilterUpns;
    }
  }

  return upns;
}

async function readSingleArray (query, params) {
  const timeStart = new Date();
  // console.log(`--- Running query:\n ${query}`);
  const results = await connector.runRawQuery(query, params);
  const timeEnd = new Date();
  const array = results.records.map(node => node._fields[0]);
  console.log(`graphFilter: returned ${array.length} upns...`);
  console.log(`graphFilter: processing time: ${timeEnd - timeStart}ms`);
  return array;
}

async function sortResults (upns, params) {
  let query = `MATCH (persona:Persona) WHERE persona.upn IN $upns\n`;
  query += `RETURN DISTINCT persona 
  ORDER BY persona.${params.field} ${params.direction}
  SKIP ${(params.number - 1) * params.size}
  LIMIT ${params.size}`;

  const results = await connector.runRawQuery(query, { upns });
  return results;
}

module.exports = graphFilter;