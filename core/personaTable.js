const graph = require('./graph.js');

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

// Filter condition options
const filterConditions = [
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

async function fromTableForm(tableForm = {}, preFilters = []) {

  const graphSort = {
    field: tableForm?.sortProperty ? tableForm.sortProperty : "upn",
    direction: tableForm?.sortDirection ? tableForm.sortDirection : "ASC",
  }
  const graphFilters = graphFiltersFromTableForm(tableForm);

  console.log('Graph Filters:', graphFilters)
  console.log('Graph Sort:', graphSort)

  const allGraphFilters = [...graphFilters, ...preFilters]

  const rawPersonas = await graph.readAgents(null, allGraphFilters, graphSort);
  const tableRows = rowsFromRawQuery(rawPersonas);
  return dataPrep(tableRows, tableForm);
}

function graphFiltersFromTableForm(tableForm) {
  const tableFilters = getTableFilterArray(tableForm);

  console.log('Table Filters:', tableFilters)

  const graphFilters = tableFilters.map(filter => {
    const type = "field";
    const key = filter.property;
    const value = filter.value;

    switch (filter.condition) {
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

function rowsFromRawQuery(rawPersonas) {

  const data = rawPersonas.records.map(node => node._fields[0].properties);

  const defaultFields = ["upn", "platform", "type", "id"]
  const actualFields = data.map(row => Object.keys(row)).flat().sort();
  const fields = new Set([...defaultFields, ...actualFields]);

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
 * Table Component Data Preparation
 */
function dataPrep(tableRows, tableForm) {

  // Get the properties from the table rows
  const keys = Object.keys(tableRows[0]);
  const properties = keys?.map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
    value: key,
  }));

  // Get a list of hidden table columns
  const visibility = tableForm?.visibility || '';

  const tableData = {
    sortDirections: sortDirections,
    filterConditions: filterConditions,
    properties: properties || [],
    rows: tableRows || [],
    sortProperty: tableForm?.sortProperty || keys[0] || '',
    sortDirection: tableForm?.sortDirection || sortDirections[0].value,
    filters: getTableFilterArray(tableForm),
    visibility: visibility
  };

  return tableData;
}

function getTableFilterArray(tableForm) {
  // Get the filter properties from the tableData
  const filters = [];
  if (tableForm) {
    // Ensure that formData properties are always arrays
    const properties = Array.isArray(tableForm.filterProperty) ? tableForm.filterProperty : [tableForm.filterProperty];
    const conditions = Array.isArray(tableForm.filterCondition) ? tableForm.filterCondition : [tableForm.filterCondition];
    const terms = Array.isArray(tableForm.filterTerm) ? tableForm.filterTerm : [tableForm.filterTerm];

    // Loop through properties and add valid entries to filters
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const condition = conditions[i];
      const value = terms[i];

      // Only add if none of the values are undefined
      if (property !== undefined && condition !== undefined && value !== undefined) {
        filters.push({ property, condition, value });
      }
    }

    // Check for new filter
    if (tableForm.filterNewProperty && tableForm.filterNewCondition && tableForm.filterNewTerm) {
      filters.push({
        property: tableForm.filterNewProperty,
        condition: tableForm.filterNewCondition,
        value: tableForm.filterNewTerm,
      });
    }
  }
  return filters;
}

module.exports = {
  fromTableForm,
};