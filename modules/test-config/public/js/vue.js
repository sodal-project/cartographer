// Load Vue only for this module
import { defineCustomElement, h } from 'https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js';

// Add some debugging
console.log('Vue custom elements loaded');

export { defineCustomElement, h }; 