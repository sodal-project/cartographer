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

async function runFilter(formData) {
  const filter = JSON.parse(formData.filter);
  const tableData = await core.mod.personaTable.build({
    tableFormId: "filter-table-form",
    forceFilters: filter,
  });
  return redraw({ 
    filterName: formData.filterName,
    filterId: formData.filterId,
    filter: JSON.stringify(filter, null, 2),
    tableData,
  });
}

async function runSavedFilter(formData) {
  const filters = await core.config.readConfig("filters") || {};
  const filter = filters[formData.filterId];
  
  if (!filter) {
    throw new Error('Filter not found');
  }

  const parsedFilter = JSON.parse(filter.expression);
  const tableData = await core.mod.personaTable.build({
    tableFormId: "filter-table-form",
    forceFilters: parsedFilter,
  });

  const savedFilters = Object.values(filters)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return redraw({
    filterId: filter.id,
    filterName: filter.name,
    filter: filter.expression,
    tableData,
    savedFilters,
  });
}

async function saveFilter(formData) {
  const filters = await core.config.readConfig("filters") || {};
  const filterId = formData.filterId || crypto.randomUUID();
  
  filters[filterId] = {
    id: filterId,
    name: formData.filterName,
    expression: formData.filter,
    updatedAt: new Date().toISOString(),
  };

  await core.config.writeConfig({filters});

  const savedFilters = Object.values(filters)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return redraw({ 
    filter: formData.filter,
    savedFilters,
  });
}

async function loadFilter(formData) {
  const filters = await core.config.readConfig("filters") || {};
  const filter = filters[formData.filterId];
  
  if (!filter) {
    throw new Error('Filter not found');
  }

  const tableData = await core.mod.personaTable.build({
    tableFormId: "filter-table-form",
    forceFilters: JSON.parse(filter.expression),
  });

  const savedFilters = Object.values(filters)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return redraw({
    filterId: filter.id,
    filterName: filter.name,
    filter: filter.expression,
    tableData,
    savedFilters,
  });
}

async function deleteFilter(formData) {
  const filters = await core.config.readConfig("filters") || {};
  delete filters[formData.filterId];
  
  await core.config.writeConfig({filters});

  const savedFilters = Object.values(filters)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  
  return redraw({ savedFilters });
}

async function clearForm() {
  const filters = await core.config.readConfig("filters") || {};
  const savedFilters = Object.values(filters)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return redraw({
    savedFilters,
    tableData: await core.mod.personaTable.build({ tableFormId: "filter-table-form" })
  });
}

module.exports = {
  mainPane,
  runFilter,
  runSavedFilter,
  saveFilter,
  loadFilter,
  deleteFilter,
  clearForm,
};
