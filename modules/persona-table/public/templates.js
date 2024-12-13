export const templates = {
  main: (state) => `
    <div class="p-8">
      <div class="relative">
        ${templates.exportCsv(state)}
        ${templates.tableControls(state)}
        ${templates.table(state)}
      </div>
      <!-- Count -->
      <div class="text-gray-500 text-sm mt-4">
        Showing ${state.rows?.length} of ${state.totalCount} results
      </div>
    </div>
  `,

  exportCsv: (state) => `
    <form
      class="absolute z-10 right-10 top-1 pr-1 pt-px"
      hx-ext="download-csv"
      hx-post="/mod/exportCsv/download/download"
    >
      <input type="hidden" name="csvFilter" value='${JSON.stringify(state.graphFilters || [])}'>
      <button class="text-white" type="submit">
        <div class="w-5 h-5 text-gray-500 hover:text-white">
          <!-- Download icon SVG here -->
        </div>
      </button>
    </form>
  `,

  tableControls: (state) => `
    <div class="relative flex mb-4">
      ${templates.sortDropdown(state)}
      ${templates.activeFilters(state)}
      ${templates.addFilterButton(state)}
    </div>
  `,

  sortDropdown: (state) => `
    <div class="relative border-r border-gray-700 pr-4" data-dropdown="sort">
      <button
        class="flex gap-1 items-center inline-block h-7 px-3 rounded-full border border-indigo-500 text-indigo-400 bg-indigo-900 bg-opacity-30"
        type="button"
        data-dropdown-toggle="sort"
      >
        <span class="flex items-center justify-center w-3.5 h-3.5 text-indigo-400">
          ${state.sortDirection === 'DESC' ? '↓' : '↑'}
        </span>
        <span class="text-sm capitalize">${state.sortField}</span>
        <span class="flex items-center justify-center w-3.5 h-3.5 text-indigo-400">▼</span>
      </button>

      <div
        class="absolute z-10 top-9 -translate-x-1/2 w-96 border border-gray-700 bg-gray-800 shadow-xl rounded-lg p-5 hidden"
        data-dropdown-content="sort"
      >
        <div class="flex gap-3 items-center w-full">
          <select name="sortField" class="bg-gray-900 text-white rounded p-2">
            ${state.fields?.map(field => `
              <option value="${field.value}" ${field.value === state.sortField ? 'selected' : ''}>
                ${field.label}
              </option>
            `).join('')}
          </select>
          <select name="sortDirection" class="bg-gray-900 text-white rounded p-2">
            ${state.sortDirections?.map(dir => `
              <option value="${dir.value}" ${dir.value === state.sortDirection ? 'selected' : ''}>
                ${dir.label}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="mt-4">
          <button class="bg-indigo-600 text-white px-4 py-2 rounded" data-action="save-sort">
            Save
          </button>
        </div>
      </div>
    </div>
  `,

  activeFilters: (state) => `
    <div class="flex">
      ${state.filters?.map(filter => templates.filter(filter, state)).join('')}
    </div>
  `,

  filterForm: (state, filter = {}, isNew = false) => `
    <div class="flex gap-3 mb-3">
      <select name="${isNew ? 'filterNewField' : 'filterField'}" class="bg-gray-900 text-white rounded p-2 flex-1">
        ${state.fields?.map(field => `
          <option value="${field.value}" ${field.value === filter.field ? 'selected' : ''}>
            ${field.label}
          </option>
        `).join('')}
      </select>
      <select name="${isNew ? 'filterNewOperator' : 'filterOperator'}" class="bg-gray-900 text-white rounded p-2 flex-1">
        ${state.filterOperators?.map(op => `
          <option value="${op.value}" ${op.value === filter.operator ? 'selected' : ''}>
            ${op.label}
          </option>
        `).join('')}
      </select>
    </div>
    <input
      type="text"
      name="${isNew ? 'filterNewValue' : 'filterValue'}"
      value="${filter.value || ''}"
      class="w-full text-white text-sm bg-gray-900 border border-gray-700 rounded-md p-2 px-3"
    />
  `,

  filter: (filter, state) => `
    <div class="relative filter-ui" data-dropdown="filter-${filter.field}">
      <button
        class="flex gap-1 items-center inline-block h-7 px-3 ml-4 rounded-full border border-gray-700 text-sm text-gray-500 bg-gray-900 bg-opacity-30 hover:bg-gray-800"
        data-dropdown-toggle="filter-${filter.field}"
      >
        <span class="capitalize">${filter.field}</span>
        <span class="relative w-3.5 h-3.5 text-gray-500 inline-block">▼</span>
      </button>

      <div
        class="absolute z-10 top-9 left-1/2 -translate-x-1/2 min-w-[24rem] border border-gray-700 bg-gray-800 shadow-xl rounded-lg p-5 hidden"
        data-dropdown-content="filter-${filter.field}"
      >
        ${templates.filterForm(state, filter, false)}
        <div class="flex justify-between w-full mt-4">
          <button
            class="bg-indigo-600 rounded text-white text-sm p-1 px-6"
            data-action="update-filter"
            data-field="${filter.field}"
          >
            Save
          </button>
          <button
            class="p-1 px-6 rounded text-white text-sm bg-gray-600"
            data-action="remove-filter"
            data-field="${filter.field}"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  `,

  addFilterButton: (state) => `
    <div class="relative ml-2" data-dropdown="new-filter">
      <button
        class="inline-block h-7 px-2 text-gray-500 text-sm rounded-md hover:bg-gray-800"
        data-dropdown-toggle="new-filter"
      >
        + Add filter
      </button>

      <div
        class="absolute z-10 top-9 -translate-x-1/2 min-w-[24rem] border border-gray-700 bg-gray-800 shadow-xl rounded-lg p-5 hidden"
        data-dropdown-content="new-filter"
      >
        ${templates.filterForm(state, {}, true)}
        <div class="mt-4">
          <button class="bg-indigo-600 text-white px-4 py-2 rounded" data-action="save-new-filter">
            Save
          </button>
        </div>
      </div>
    </div>
  `,

  table: (state) => `
    <div class="overflow-scroll">
      <table class="min-w-full">
        ${templates.tableHeader(state)}
        ${templates.tableBody(state)}
      </table>
    </div>
  `,

  tableHeader: (state) => `
    <thead class="sticky top-0">
      <tr>
        <th class="sticky top-0 p-4 bg-gray-900 text-left w-12">
          <div class="absolute bottom-0 left-0 right-0 border-b border-gray-700"></div>
          <input
            type="checkbox"
            data-select-all
            ${state.selectedUpns?.length === state.rows?.length ? 'checked' : ''}
          >
        </th>
        ${state.fields?.map(field => `
          <th class="sticky top-0 py-4 text-left text-sm font-semibold bg-gray-900 text-white">
            <div class="absolute bottom-0 left-0 right-0 border-b border-gray-700"></div>
            ${field.label}
          </th>
        `).join('')}
      </tr>
    </thead>
  `,

  tableBody: (state) => `
    <tbody class="divide-y divide-gray-800">
      ${state.rows?.map(row => templates.tableRow(row, state)).join('')}
    </tbody>
  `,

  tableRow: (row, state) => `
    <tr class="hover:bg-indigo-600 hover:bg-opacity-20">
      <td class="p-4">
        <input 
          type="checkbox"
          value="${row.upn}"
          name="upn"
          ${state.selectedUpns?.includes(row.upn) ? 'checked' : ''}
        >
      </td>
      ${Object.values(row).map(value => `
        <td class="whitespace-nowrap p-4 pl-0 text-sm font-medium text-white">
          ${value}
        </td>
      `).join('')}
    </tr>
  `
};
