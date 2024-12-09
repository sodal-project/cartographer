// modules/test-config/public/js/client.js
import { defineCustomElement } from './vue.js'

const TestConfigModule = defineCustomElement({
  props: {
    initialData: {
      type: String,
      required: true,
      default: '{}',
    }
  },

  computed: {
    parsedData() {
      try {
        return JSON.parse(this.initialData);
      } catch (e) {
        console.error('Failed to parse initialData:', e);
        return {};
      }
    },
    
    config() {
      return this.parsedData.config || {};
    }
  },

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
      form: { key: '', value: '' }
    }
  },

  methods: {
    async submitForm() {
      if (!this.form.key || !this.form.value) return;
      
      const instanceId = this.$el.getAttribute('id').split('-').pop();
      await fetch(`/mod/test-config/writeConfig?instance=${instanceId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          key: this.form.key,
          value: this.form.value
        })
      });
      
      this.form.key = '';
      this.form.value = '';
    },

    async deleteConfig(key) {
      const instanceId = this.$el.getAttribute('id').split('-').pop();
      await fetch(`/mod/test-config/deleteConfig?instance=${instanceId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ key })
      });
    }
  }
});

// Make sure this runs after the component is defined
customElements.define('test-config-module', TestConfigModule);