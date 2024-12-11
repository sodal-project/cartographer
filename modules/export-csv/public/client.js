class ExportCsvModule extends window.CoreClientModule {
  static moduleName = 'export-csv';

  updateUI(state = {}) {
    this.renderComponent({
      html: `
        <div class="p-8" style="max-width: 640px">
          <h2 class="text-xl mb-4 text-white">Export CSV</h2>
          
          <div class="rounded-lg p-6 border border-gray-700 bg-gray-900">
            <form id="export-form" class="gap-6 mb-0">
              <div class="flex-grow">
                <label class="block text-white text-sm mb-2" for="filter">
                  Filter:
                </label>
                <textarea
                  class="rounded p-1 text-sm w-full m-0 mb-2 align-top h-80 bg-gray-800 text-white"
                  id="filter-input"
                  placeholder="Enter JSON filter..."
                ></textarea>
              </div>

              <div class="flex items-center justify-between mt-4">
                <button 
                  type="submit"
                  class="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded text-white"
                  ${state.status === 'processing' ? 'disabled' : ''}
                >
                  ${state.status === 'processing' ? 'Processing...' : 'Export CSV'}
                </button>

                ${state.lastExport ? `
                  <span class="text-gray-400 text-sm">
                    Last export: ${new Date(state.lastExport).toLocaleString()}
                  </span>
                ` : ''}
              </div>

              ${state.error ? `
                <div class="mt-4 text-red-400 text-sm">
                  Error: ${state.error}
                </div>
              ` : ''}
            </form>
          </div>
        </div>
      `
    });
  }

  setupEvents() {
    const form = this.shadowRoot.getElementById('export-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const filterInput = this.shadowRoot.getElementById('filter-input');
      
      try {
        const response = await this.call({
          method: 'exportCsv',
          params: {
            filter: filterInput.value
          }
        });

        // Handle the CSV download
        if (response.file) {
          const blob = new Blob([response.file], { type: response.type });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = response.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

      } catch (error) {
        console.error('Export error:', error);
      }
    });
  }
}

window.CoreClientModule.define(ExportCsvModule); 