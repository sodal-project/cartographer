const core = require('../../core/core.js');

// Sort direction options
const sortDirections = [
  {
    label: 'Ascending',
    value: 'ASC',
  },
  {
    label: 'Descending',
    value: 'DESC',
  },
];

// Filter operator options
const filterOperators = [
  {
    label: 'Is',
    value: 'is',
  },
  {
    label: 'Is Not',
    value: 'is-not',
  },
  {
    label: 'Contains',
    value: 'contains',
  },
  {
    label: 'Not Contains',
    value: 'not-contains',
  },
  {
    label: 'Starts With',
    value: 'starts-with',
  },
  {
    label: 'Ends With',
    value: 'ends-with',
  },
  {
    label: 'Empty',
    value: 'not-empty',
  },
];

/**
 * @description Build a table from a TableConfig object
 * 
 * @param {object} tableConfig - The table configuration object
 * @returns {object} - The table data object used to render a table
 */
async function build(tableConfig) {
  // check for required fields
  if(!tableConfig) {
    throw new Error('Table Config is required to build a table');
  } else if(!tableConfig.tableFormId) {
    throw new Error('Table Form ID is required to build a table');
  }

  // Read the table data 
  const tableKey = getTableKey(tableConfig.tableFormId);

  // Merge the new config with the existing config (if applicable)
  const existingConfig = await core.config.readConfig(tableKey);
  if(existingConfig) {
    tableConfig = { ...existingConfig, ...tableConfig };
  }

  // Write the updated config to the database
  await core.config.writeConfig({ [tableKey]: tableConfig });

  // Get the last table form or create a new one
  // NOTE: this is necessary because the table form is not passed in the build function
  const tableForm = tableConfig.lastTableForm || { tableFormId: tableConfig.tableFormId }

  // Return a table data object
  return await read(tableConfig, tableForm);
}

/**
 * @description Update a table with new data
 * 
 * This function is called when the table form is submitted.
 * This function should not be called by other modules. 
 * Use build() instead.
 * 
 * @param {object} tableForm - The table form object required to update a table
 * @returns {string} - Compiled HTML content
 */
async function update(tableForm) {
  const tableFormId = tableForm.tableFormId;
  const tableKey = getTableKey(tableFormId);

  // read the current table config
  const tableConfig = await core.config.readConfig(tableKey);
  if(!tableConfig) {
    throw new Error('Table Config not found for table form ID: ' + tableFormId);
  }

  // update the current table form state
  tableConfig.lastTableForm = tableForm;
  await core.config.writeConfig({ [tableKey]: tableConfig });

  // generate table data required to render the table
  const data = await read(tableConfig, tableForm);

  return await core.client.render('personaTable.hbs', { tableData: data } );
}
/**
 * @description Read a table from a TableConfig object
 * 
 * @param {object} tableConfig - The table configuration object
 * @param {object} tableForm - The table form object
 * @returns {object} - The table data object used to render a table
 */
async function read(tableConfig, tableForm) {
  
  // Set the action for the table form
  tableForm.action = tableConfig.action;

  // Get the sort field and direction
  const graphSort = tableConfig.forceSort || {
    field: tableForm?.sortField ? tableForm.sortField : "upn",
    direction: tableForm?.sortDirection ? tableForm.sortDirection : "ASC",
  }
 
  // Get the filters defined by the table form
  const graphFilters = graphFiltersFromTableForm(tableForm);

  // Get filters that are always applied
  const forceFilters = tableConfig.forceFilters || [];

  // Combine the filters
  const allGraphFilters = [...graphFilters, ...forceFilters]

  // Get the personas from the graph based on the current filters and sort
  const rawPersonas = await core.graph.readPersonas(allGraphFilters, graphSort);

  // Get table rows based on the returned personas
  const tableRows = rowsFromRawQuery(rawPersonas, tableConfig.forceVisibility);

  // Get a list of the table's fields
  let keys = [];
  if(tableRows[0]) {
    keys = Object.keys(tableRows[0])
  }

  // If config forces visibility, retain only the forced visible fields
  if (tableConfig.forceVisibility && tableConfig.forceVisibility.length > 0) {
    keys = keys.filter(key => tableConfig.forceVisibility.includes(key));
  }

  // Generate labels for each field name
  const fields = keys?.map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
    value: key,
  }));

  // Get a list of hidden table columns
  const visibility = tableForm.visibility || '';

  // Generate the table data object
  const tableData = {
    tableFormId: tableForm.tableFormId,
    sortDirections: sortDirections,
    filterOperators: filterOperators,
    fields: fields || [],
    action: tableForm.action,
    rows: tableRows || [],
    sortField: tableForm.sortField || keys[0] || '',
    sortDirection: tableForm.sortDirection || sortDirections[0].value,
    filters: getTableFilterArray(tableForm),
    visibility: visibility,
  };

  return tableData;
}

/**
 * @description Convert a table form into graph filters
 * 
 * @param {object} tableForm - The table form object
 * @returns {object[]} - A graph filter array
 */
function graphFiltersFromTableForm(tableForm) {
  const tableFilters = getTableFilterArray(tableForm);

  // console.log('Table Filters:', tableFilters)

  const graphFilters = tableFilters.map(filter => {
    const type = "field";
    const key = filter.field;
    const value = filter.value;

    switch (filter.operator) {
      case "is":
        return { type, key, value, operator: "=", not: false };
      case "is-not":
        return { type, key, value, operator: "<>", not: false };
      case "contains":
        return { type, key, value, operator: "contains", not: false };
      case "not-contains":
        return { type, key, value, operator: "contains", not: true };
      case "starts-with":
        return { type, key, value, operator: "startswith", not: false };
      case "ends-with":
        return { type, key, value, operator: "endswith", not: false };
      case "not-empty":
        return { type, key, value: "", operator: "<>", not: false };
    }
  });

  return graphFilters;
}

/**
 * @description Convert raw query results into table rows
 * 
 * @param {object} rawPersonas - The raw graph query results
 * @param {string[]} forceVisibility - Optional: force visibility of a subset of fields
 * @returns {object[]} - An array of table row objects
 */
function rowsFromRawQuery(rawPersonas, forceVisibility) {

  const data = rawPersonas.records.map(node => node._fields[0].properties);

  // Get the fields from the data
  const defaultFields = ["upn", "platform", "type", "id", "friendlyName"]
  const actualFields = data.map(row => Object.keys(row)).flat().sort();
  const fields = forceVisibility || new Set([...defaultFields, ...actualFields]);

  // Ensure that all rows have all fields
  const prepRows = data.map(row => { 
    const newRow = {};
    for(const field of fields) {
      newRow[field] = row[field] || '';
    }
    return newRow;
  })

  return prepRows;
}

/**
 * @description Convert a table form into a filter array to generate a new table's filters
 * 
 * The table form passes back three ordered arrays representing the filter state: 
 *   filterField, filterOperator, filterValue
 *   These arrays must be combined into a single array of filter objects
 * 
 * @param {object} tableForm - The table form object
 * @returns {object[]} - An array of form filter objects
 */
function getTableFilterArray(tableForm) {

  // Get the filter properties from the tableData
  const filters = [];
  if (tableForm) {
    // Ensure that formData properties are always arrays
    const fields = Array.isArray(tableForm.filterField) ? tableForm.filterField : [tableForm.filterField];
    const operators = Array.isArray(tableForm.filterOperator ) ? tableForm.filterOperator : [tableForm.filterOperator];
    const values = Array.isArray(tableForm.filterValue) ? tableForm.filterValue : [tableForm.filterValue];

    // Loop through properties and add valid entries to filters
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const operator = operators[i];
      const value = values[i];

      // Only add if none of the values are undefined
      if (field !== undefined && operator !== undefined && value !== undefined) {
        filters.push({ field, operator, value });
      }
    }

    // Check for new filter
    if (tableForm.filterNewField && tableForm.filterNewOperator && tableForm.filterNewValue) {
      filters.push({
        field: tableForm.filterNewField,
        operator: tableForm.filterNewOperator,
        value: tableForm.filterNewValue,
      });
    }
  }
  return filters;
}

/**
 * @description Get the configuration key for a table config object
 * 
 * @param {string} tableFormId - The table form ID
 * @returns {string} - The table config key
 */
function getTableKey(tableFormId) {
  if(tableFormId) {
    return `table-config-${tableFormId}`;
  } else {
    throw new Error('Table Form ID is required to setup a table');
  }
}

module.exports = {
  build,
  update,
};