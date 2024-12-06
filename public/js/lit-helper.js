import { LitElement, html, css } from 'lit';

// Make Lit available globally for modules
window.ModuleLit = {
  LitElement,
  html,
  css
};

// Base element that modules can extend
export class ModuleLitElement extends LitElement {}

window.ModuleLit.ModuleLitElement = ModuleLitElement; 