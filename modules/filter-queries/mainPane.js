const core = require('../../core/core.js');

/**
 * @description 
 * @returns {string} - Compiled HTML content
 */
async function redraw(data) {
  return core.client.render('mainPane.hbs', data);
}

// PUBLIC

/**
 * @description The main interface for the module.
 * @returns {string} - Compiled HTML content
 */
async function mainPane() {
  const filters = await core.config.readConfig("filters") || {};
  const savedFilters = Object.values(filters)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  
  return redraw({ savedFilters });
}

async function getFilterTableHtml(forceFilters = null) {
  const tableConfig = {
    tableFormId: "filter-table-form",
    ...(forceFilters && { forceFilters }),
  };
  return core.mod.personaTable.getTable(tableConfig);
}

async function getSortedFilters() {
  const filters = await core.config.readConfig("filters") || {};
  return Object.values(filters)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function handleFilter(formData) {
  let filter, parsedFilter;

  // Handle saved filter case
  if (formData.filterId && !formData.filter) {
    const filters = await core.config.readConfig("filters") || {};
    filter = filters[formData.filterId];
    if (!filter) {
      throw new Error('Filter not found');
    }
    parsedFilter = JSON.parse(filter.expression);
    formData.filter = filter.expression;
    formData.filterName = filter.name;
  }
  // Handle new/edited filter case
  else if (formData.filter) {
    parsedFilter = JSON.parse(formData.filter);
  }

  const [tableHtml, savedFilters] = await Promise.all([
    getFilterTableHtml(parsedFilter),
    getSortedFilters()
  ]);

  return redraw({
    filterId: formData.filterId,
    filterName: formData.filterName,
    filter: formData.filter,
    tableHtml,
    savedFilters,
  });
}

async function clearForm() {
  const [tableHtml, savedFilters] = await Promise.all([
    getFilterTableHtml(),
    getSortedFilters()
  ]);

  return redraw({
    savedFilters,
    tableHtml
  });
}

module.exports = {
  mainPane,
  handleFilter,
  clearForm,
};
