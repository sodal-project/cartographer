class TestConfigModule extends window.CoreClientModule {
  static moduleName = 'test-config';

  updateUI(state) {
    const config = state || {};
    const configEntries = Object.entries(config);
    
    this.renderComponent({
      html: `
        <div class="p-4">
          <h2 class="text-xl mb-4 text-white">Test Config</h2>
          
          <!-- Config Display -->
          <div class="mb-4 bg-gray-800 rounded p-4">
            ${configEntries.length > 0 
              ? configEntries.map(([key, value]) => `
                  <div class="flex justify-between mb-2 text-white">
                    <span>${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}</span>
                    <button data-key="${key}" class="delete-btn text-red-400 hover:text-red-300">Delete</button>
                  </div>
                `).join('')
              : '<div class="text-gray-400">No configuration values yet</div>'
            }
          </div>

          <!-- Add Form -->
          <form id="config-form" class="flex gap-4">
            <input id="key-input" placeholder="Key" class="bg-gray-700 rounded px-2 text-white">
            <input id="value-input" placeholder="Value" class="bg-gray-700 rounded px-2 text-white">
            <button type="submit" class="bg-blue-500 hover:bg-blue-400 px-4 rounded text-white">Add</button>
          </form>
        </div>
      `
    });
  }

  setupEvents() {
    // Handle form submission
    const form = this.shadowRoot.getElementById('config-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const keyInput = this.shadowRoot.getElementById('key-input');
      const valueInput = this.shadowRoot.getElementById('value-input');
      
      if (!keyInput.value || !valueInput.value) return;

      await this.call({
        method: 'writeConfig',
        params: {
          key: keyInput.value,
          value: valueInput.value
        }
      });

      keyInput.value = '';
      valueInput.value = '';
    });

    // Handle delete buttons
    this.shadowRoot.addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-btn')) {
        const key = e.target.dataset.key;
        await this.call({
          method: 'deleteConfig',
          params: { key }
        });
      }
    });
  }
}

window.CoreClientModule.define(TestConfigModule);