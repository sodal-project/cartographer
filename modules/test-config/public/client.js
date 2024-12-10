import { createApp } from '/public/test-config/vue.js';

class TestConfigModule extends window.CoreClientModule {
  static moduleName = 'test-config';

  async init() {
    console.log('[TestConfigModule] init started');
    const component = this;

    // Create Vue app inside shadow root
    const app = createApp({
      template: `
        <div class="p-4">
          <h2 class="text-xl mb-4 text-white">Test Config</h2>
          
          <!-- Config Display -->
          <div class="mb-4 bg-gray-800 rounded p-4">
            <div v-if="Object.keys(config).length > 0">
              <div v-for="(value, key) in config" :key="key" class="flex justify-between mb-2 text-white">
                <span>{{ key }}: {{ value }}</span>
                <button @click="deleteConfig(key)" class="text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
            <div v-else class="text-gray-400">
              No configuration values yet
            </div>
          </div>

          <!-- Add Form -->
          <form @submit.prevent="submitForm" class="flex gap-4">
            <input v-model="form.key" placeholder="Key" class="bg-gray-700 rounded px-2 text-white">
            <input v-model="form.value" placeholder="Value" class="bg-gray-700 rounded px-2 text-white">
            <button type="submit" class="bg-blue-500 hover:bg-blue-400 px-4 rounded text-white">Add</button>
          </form>
        </div>
      `,

      data() {
        return {
          config: {},
          form: { key: '', value: '' }
        }
      },

      methods: {
        async submitForm() {
          if (!this.form.key || !this.form.value) return;
          
          await fetch(`/mod/${component.constructor.moduleName}/writeConfig`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              instanceId: component.instanceId,
              key: this.form.key,
              value: this.form.value
            })
          });
          
          this.form.key = '';
          this.form.value = '';
        },

        async deleteConfig(key) {
          await fetch(`/mod/${component.constructor.moduleName}/deleteConfig`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              instanceId: component.instanceId,
              key
            })
          });
        },

        updateConfig(data) {
          console.log('Updating config with:', data); // Debug log
          this.config = data.config || {};
        }
      }
    });

    console.log('[TestConfigModule] Mounting Vue app');
    const vm = app.mount(this.shadowRoot);
    
    console.log('[TestConfigModule] Setting up subscription');
    this.subscribe(data => vm.updateConfig(data));
    
    console.log('[TestConfigModule] Fetching initial state');
    const initialState = await this.fetchInitialState();
    vm.updateConfig(initialState);
    console.log('[TestConfigModule] Initial state loaded:', initialState);
  }
}

console.log('[TestConfigModule] Defining custom element');
window.CoreClientModule.define(TestConfigModule);