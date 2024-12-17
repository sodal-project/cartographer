/**
 * @fileoverview Graph filtering operations
 * @module Core/graphFilter
 */

import connector from './graphNeo4jConnector.js';
import CC from './constants.js';
import { consoleLog } from './log.js';

/** @typedef {import('./types').FilterObject} FilterObject */
/** @typedef {import('./types').FilterParams} FilterParams */
/** @typedef {import('./types').FieldFilter} FieldFilter */
/** @typedef {import('./types').SourceFilter} SourceFilter */
/** @typedef {import('./types').AgencyFilter} AgencyFilter */
/** @typedef {import('./types').CompareFilter} CompareFilter */
/** @typedef {import('./types').SetFilter} SetFilter */
/** @typedef {import('./types').PropertyOperator} PropertyOperator */
/** @typedef {import('./types').PersonaObject} PersonaObject */

/**
 * @typedef {FilterObject[]} Filter
 * Array of filter objects that are combined with AND logic
 */

/**
 * @typedef {Object} GraphFilterResponse
 * @property {Object} raw - Raw Neo4j response
 * @property {PersonaObject[]} personas - Array of filtered persona objects
 * @property {number} totalCount - Total number of matching personas
 * @property {string[]} upns - Array of matching UPNs
 * @property {number} time - Query execution time in ms
 */

// Valid operators for filtering that map to Neo4j syntax
/** @type {Object.<string, PropertyOperator>} */
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

/** @type {number[]} */
const allLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/**
 * Filter the graph database based on the provided filter
 * @param {Filter} filter - Array of filter objects
 * @param {FilterParams} [params] - Sort and pagination parameters
 * @returns {Promise<GraphFilterResponse>} Query results
 */
async function graphFilter(filter, params = {}) {
  const timeStart = new Date();

  const defaultParams = { 
    field: "upn", 
    direction: "ASC", 
    pageNum: 1, 
    pageSize: 500
  }
  params = { ...defaultParams, ...params };
  
  let upns = await getUpnsFromFilter(filter);
  if(upns === null) {
    upns = await getAllUpns();
  }

  const sortedResults = await sortResults(upns, params);

  const time = new Date() - timeStart;
  consoleLog(`Graph filter processing time: ${time}ms`);

  return {
    raw: sortedResults,
    personas: sortedResults.records.map(node => node._fields[0].properties),
    totalCount: upns.length,
    upns,
    time
  };
}

/**
 * Get the UPNs matching the filter criteria
 * @param {Filter} filter - Filter criteria
 * @returns {Promise<string[]|null>} Matching UPNs or null for all
 */
async function getUpnsFromFilter(filter) {
  if(!filter) { return await getAllUpns(); }

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

  let upns = null; // null until we have a filter to apply; implies all upns

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

/**
 * Get all UPNs from the graph
 * @returns {Promise<string[]>} All UPNs
 */
async function getAllUpns() {
  return await readSingleArray(`MATCH (persona:Persona) RETURN DISTINCT persona.upn`);
}

async function getUpnsByFieldArray(fieldArray) {
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

async function getUpnsBySetArray(setArray, upns) {
  // identify only the upns that are in all sets
  for(const set of setArray) {
    if(!upns) {
      upns = set.upns;
    } else {
      upns = upns.filter(upn => set.upns.includes(upn));
    }
  }
  return upns;
}

async function getUpnsBySourceArray(sourceArray, upns) {
  let query = `MATCH (source:Source)-[:DECLARE]->(persona:Persona) WHERE 1=1 \n`;

  for(const source in sourceArray) {

    const filter = sourceArray[source];
    const operator = operators[filter.operator];
    const fieldKey = filter.key;
    const fieldValue = filter.value;
    const modifier = filter.not ? "NOT " : "";

    if(!operator || !fieldKey || !fieldValue) {
      throw new Error('Invalid source filter');
    } else if(fieldKey !== 'name' && fieldKey !== 'id' && fieldKey !== 'lastUpdate') {
      throw new Error('Invalid source filter key (must be name, id, or lastUpdate)');
    }

    query += `AND ${modifier}source.${fieldKey} ${operator} "${fieldValue}"\n`;
  }
  if(upns) {
    query += `AND persona.upn IN $upns\n`;
  }
  query += `RETURN DISTINCT persona.upn`;
  return await readSingleArray(query, { upns });
}

async function getUpnsByAgency(agency, upns) {

  // Convert agency.confidence into a min and max
  const confidence = agency.confidence || { min: 0, max: 1 };
  confidence.min = parseFloat(confidence.min);
  confidence.max = parseFloat(confidence.max);
  if(confidence.min > confidence.max || confidence.min < 0 || confidence.max > 1) {
    throw new Error('Invalid confidence range');
  }

  // Convert agency.levels into an array of levels
  const levels = [];
  if(!agency.levels || agency.levels.length === 0) {
    levels.push(CC.LEVEL.ALIAS); // default to ALIAS only
  } else {
    if(agency.levels.includes('*')) {
      for(const level of allLevels) {
        if(CC.LEVEL[level]) {
          levels.push(CC.LEVEL[level]);
        }
      }
    } else {
      for(const level of agency.levels) {
        if(!CC.LEVEL[level]) {
          throw new Error('Invalid level');
        }
        levels.push(CC.LEVEL[level]);
      }
    }
  }

  // Identify the filtering control pattern
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
  // Default is all depths (including zero depth)
  const depth = agency.depth;
  let depthString = "*0..";
  let isZeroDepth = true;

  if (depth) {
    if (Array.isArray(depth)) {
      if (depth.length !== 2) {
        throw new Error('Depth array must contain [min, max] values');
      }
      depthString = `*${depth[0]}..${depth[1]}`; // Range: min to max depth
      isZeroDepth = parseInt(depth[0]) === 0;
    } else {
      depthString = `*0..${parseInt(depth)}`; // to a max depth
    }
  }

  // Get the upns to filter on
  const filterUpns = agency.filter ? await getUpnsFromFilter(agency.filter) : null;

  // Find all nonredundant paths between the control and obey personas
  let query = `
  MATCH path = shortestPath((control:Persona)-[rList:CONTROL ${depthString}]->(obey:Persona))
  WHERE control <> obey 
  ${filterUpns ? `AND ${filterRel}.upn IN $filterUpns` : ''}
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

  const results = await readSingleArray(query, params);

  // If we're filtering on zero depth, we need to include the upns that are in both filtersUpns and upns
  let selfUpns = [];
  if(isZeroDepth) {
    if(filterUpns && upns) { selfUpns = filterUpns.filter(upn => upns.includes(upn)); }
    else if(upns) { selfUpns = upns; }
    else if(filterUpns) { selfUpns = filterUpns; }
  } 
  return [...new Set([...results, ...selfUpns])];
}

async function getUpnsByCompare(compare, upns) {

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

async function readSingleArray(query, params) {
  const results = await connector.runRawQuery(query, params);
  const array = results.records.map(node => node._fields[0]);
  return array;
}

async function sortResults(upns, params) {

  let query = `MATCH (persona:Persona) WHERE persona.upn IN $upns\n`;
  query += `RETURN DISTINCT persona 
  ORDER BY persona.${params.field} ${params.direction}
  SKIP ${(params.pageNum - 1) * params.pageSize}
  LIMIT ${params.pageSize}`;

  return await connector.runRawQuery(query, { upns });
}

export default graphFilter;