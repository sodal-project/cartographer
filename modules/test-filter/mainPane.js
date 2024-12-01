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
  return redraw();
}

async function runFilter(formData) {
  const filter = JSON.parse(formData.filter);
  const tableData = await core.mod.personaTable.build({
    tableFormId: "filter-table-form",
    forceFilters: filter,
  })
  return redraw({ 
    filter: JSON.stringify(filter, null, 2),
    tableData,
  });
}

module.exports = {
  mainPane,
  runFilter,
};
