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

async function build(tableConfig) {
  if(!tableConfig) {
    throw new Error('Table Config is required to build a table');
  } else if(!tableConfig.tableFormId) {
    throw new Error('Table Form ID is required to build a table');
  }

  const tableKey = getTableKey(tableConfig.tableFormId);

  const existingConfig = await core.config.readConfig(tableKey);
  if(existingConfig) {
    tableConfig = { ...existingConfig, ...tableConfig };
  }
  await core.config.writeConfig({ [tableKey]: tableConfig });

  const tableForm = tableConfig.lastTableForm || { tableFormId: tableConfig.tableFormId }

  return await read(tableConfig, tableForm);
}

async function update(tableForm) {
  const tableFormId = tableForm.tableFormId;
  const tableKey = getTableKey(tableFormId);

  const tableConfig = await core.config.readConfig(tableKey);
  tableConfig.lastTableForm = tableForm;

  await core.config.writeConfig({ [tableKey]: tableConfig });

  if(!tableConfig) {
    throw new Error('Table Config not found for table form ID: ' + tableFormId);
  }

  const data = await read(tableConfig, tableForm);

  return await core.client.render('table.hbs', { tableData: data } );
}

async function read(tableConfig, tableForm) {
  
  tableForm.action = tableConfig.action;

  const graphSort = tableConfig.forceSort || {
    field: tableForm?.sortField ? tableForm.sortField : "upn",
    direction: tableForm?.sortDirection ? tableForm.sortDirection : "ASC",
  }
  // console.log('Graph Sort:', graphSort)

  const graphFilters = graphFiltersFromTableForm(tableForm);
  // console.log('Graph Filters:', graphFilters)

  const forceFilters = tableConfig.forceFilters || [];

  const allGraphFilters = [...graphFilters, ...forceFilters]

  const rawPersonas = await core.graph.readAgents(allGraphFilters, graphSort);
  const tableRows = rowsFromRawQuery(rawPersonas, tableConfig.forceVisibility);

  // Get the properties from the table rows
  let keys = [];
  if(tableRows[0]) {
    keys = Object.keys(tableRows[0])
  }

  // If config forces visibility, retain only the forced visible fields
  if (tableConfig.forceVisibility && tableConfig.forceVisibility.length > 0) {
    keys = keys.filter(key => tableConfig.forceVisibility.includes(key));
  }

  const fields = keys?.map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
    value: key,
  }));

  // Get a list of hidden table columns
  const visibility = tableForm.visibility || '';

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

function rowsFromRawQuery(rawPersonas, forceVisibility) {

  const data = rawPersonas.records.map(node => node._fields[0].properties);

  const defaultFields = ["upn", "platform", "type", "id", "friendlyName"]
  const actualFields = data.map(row => Object.keys(row)).flat().sort();
  const fields = forceVisibility || new Set([...defaultFields, ...actualFields]);

  const prepRows = data.map(row => { 
    const newRow = {};
    for(const field of fields) {
      newRow[field] = row[field] || '';
    }
    return newRow;
  })

  return prepRows;
}

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