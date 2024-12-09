import { CoreClientModule } from '/js/CoreClientModule.js';
import { createApp } from '/public/test-config/js/vue.js';

class TestConfigModule extends CoreClientModule {
  static moduleName = 'test-config';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async init() {
    // Initialize the instance first
    this.constructor.initInstance(this.instanceId);

    const component = this; // Store reference to web component

    // Create Vue app inside shadow root
    const app = createApp({
      template: `
        <div class="p-4">
          <h2 class="text-xl mb-4">Test Config</h2>
          
          <!-- Config Display -->
          <div class="mb-4 bg-gray-800 rounded p-4">
            <div v-if="Object.keys(config).length > 0">
              <div v-for="(value, key) in config" :key="key" class="flex justify-between mb-2 text-white">
                <span>{{ key }}: {{ value }}</span>
                <button @click="deleteConfig(key)" class="text-red-400">Delete</button>
              </div>
            </div>
            <div v-else class="text-gray-400">
              No configuration values yet
            </div>
          </div>

          <!-- Add Form -->
          <form @submit.prevent="submitForm" class="flex gap-4">
            <input v-model="form.key" placeholder="Key" class="bg-gray-700 rounded px-2">
            <input v-model="form.value" placeholder="Value" class="bg-gray-700 rounded px-2">
            <button type="submit" class="bg-blue-500 px-4 rounded">Add</button>
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

    // Mount Vue app to shadow root
    const vm = app.mount(this.shadowRoot);
    
    // Subscribe to state changes using realtime system
    this.subscribe(data => {
      console.log('Received update:', data); // Debug log
      vm.updateConfig(data);
    });
    
    // Load initial state
    const initialState = await this.fetchInitialState();
    vm.updateConfig(initialState);
  }
}

// Let CoreClientModule handle the custom element definition
CoreClientModule.define(TestConfigModule);