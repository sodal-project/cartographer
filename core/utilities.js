const path = require('path');

/**
 * Get Calling Folder
 * Check the stack trace to determine the calling folder.
 * 
 * @param {string} stack - The stack trace from an Error object
 * @returns {string} The name of the calling folder
 */ 
function getCallingFolder(stack) {
  try {
    const callerFile = stack.split('\n')[2].trim().match(/(\/.*)\:\d+:\d+|(\/.*)\:\d+:\d+\)/)[1];
    const folderName = path.basename(path.dirname(callerFile));
    return folderName;
  } catch (err) {
    return "client";
  }
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
 * Table Component Data Preparation
 */
function tableDataPrep(tableRows, formData = {}) {
  // Sort direction options
  const sortDirections = [
    {
      label: 'Ascending',
      value: 'ascending',
    },
    {
      label: 'Descending',
      value: 'descending',
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

  // Get the properties from the table rows
  const keys = Object.keys(tableRows[0]);
  const properties = keys?.map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
    value: key,
  }));

  // Get the filter properties from the tableData
  const filters = [];
  if (formData) {
    // Ensure that formData properties are always arrays
    const properties = Array.isArray(formData.filterProperty) ? formData.filterProperty : [formData.filterProperty];
    const conditions = Array.isArray(formData.filterCondition) ? formData.filterCondition : [formData.filterCondition];
    const terms = Array.isArray(formData.filterTerm) ? formData.filterTerm : [formData.filterTerm];

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
    if (formData.filterNewProperty && formData.filterNewCondition && formData.filterNewTerm) {
      filters.push({
        property: formData.filterNewProperty,
        condition: formData.filterNewCondition,
        value: formData.filterNewTerm,
      });
    }
  }

  // Get a list of hidden table columns
  const visibility = formData.visibility || '';

  const tableData = {
    sortDirections: sortDirections,
    filterConditions: filterConditions,
    properties: properties || [],
    rows: tableRows || [],
    sortProperty: formData?.sortProperty || keys[0] || '',
    sortDirection: formData?.sortDirection || sortDirections[0].value,
    filters: filters,
    visibility: visibility
  };

  return {
    tableData: tableData
  };
}

module.exports = {
  getCallingFolder,
  getFormattedDate,
  tableDataPrep,
};
