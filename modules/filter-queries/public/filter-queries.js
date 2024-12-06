const { ModuleLitElement, html, css } = window.ModuleLit;

class FilterQueries extends ModuleLitElement {
  static properties = {
    filters: { type: Array },
    editingFilter: { type: Object },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.filters = [];
    this.editingFilter = null;
  }

  validateJSON(text) {
    try {
      const parsed = JSON.parse(text);
      // TODO: Add more specific filter validation here
      return { isValid: true, parsed };
    } catch (e) {
      return { isValid: false, error: e.message };
    }
  }

  render() {
    return html`
      <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
        ${this.renderContent()}
      </div>
    `;
  }

  renderContent() {
    if (this.editingFilter) {
      return this.renderEditingForm();
    }
    
    if (!this.filters || this.filters.length === 0) {
      return this.renderEmptyState();
    }
    
    return html`
      ${this.renderFilterList()}
      ${this.renderAddButton()}
    `;
  }

  renderEmptyState() {
    return html`
      <div class="text-center py-6 text-gray-400">
        No filters created yet.
      </div>
      ${this.renderAddButton()}
    `;
  }

  renderFilterList() {
    return html`
      ${this.filters.map(filter => this.renderFilterItem(filter))}
    `;
  }

  renderFilterItem(filter) {
    return html`
      <div class="mb-4 last:mb-0" data-filter-id=${filter.id}>
        <div class="font-medium mb-2 p-1 hover:bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
             contenteditable
             @blur=${this.handleNameChange}
             @keydown=${this.handleEnter}>${filter.name}</div>
        
        <div class="font-mono bg-gray-900 p-4 rounded mb-2 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
             contenteditable
             @blur=${this.handleExpressionChange}
             @keydown=${this.handleEnter}>${filter.expression}</div>

        <div class="text-sm text-gray-400">
          Updated: ${new Date(filter.updatedAt).toLocaleString()}
        </div>
      </div>
    `;
  }

  renderAddButton() {
    return html`
      <div class="mt-4 flex justify-center p-4 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-indigo-500 hover:text-indigo-500 transition-colors duration-200"
           @click=${this.handleAddFilter}>
        Add New Filter
      </div>
    `;
  }

  renderEditingForm() {
    return html`
      <div class="mb-4 border border-gray-700 rounded-lg p-4">
        ${this.renderNameInput()}
        ${this.renderExpressionInput()}
        ${this.renderFormButtons()}
      </div>
    `;
  }

  renderNameInput() {
    return html`
      <input type="text"
             class="w-full bg-gray-900 p-2 rounded mb-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${!this.editingFilter.name ? 'border-red-800' : 'border-gray-700'}"
             placeholder="Filter Name (required)"
             value=${this.editingFilter.name || ''}
             @input=${this.handleNameInput}/>
    `;
  }

  renderExpressionInput() {
    return html`
      <textarea
        class="w-full h-48 font-mono bg-gray-900 p-4 rounded mb-2 text-white focus:outline-none focus:ring-2 ${this.editingFilter.isValid ? 'focus:ring-green-500 border-green-800' : 'focus:ring-red-500 border-red-800'}"
        @input=${this.handleNewExpressionChange}
        placeholder="Enter filter JSON..."
      >${this.editingFilter.expression || ''}</textarea>
    `;
  }

  renderFormButtons() {
    return html`
      <div class="flex justify-end space-x-2">
        <button 
          class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-white"
          @click=${this.handleCancelEdit}>Cancel</button>
        <button 
          class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
          ?disabled=${!this.editingFilter.isValid || !this.editingFilter.name}
          @click=${this.handleSaveEdit}>Save</button>
      </div>
    `;
  }

  handleNameInput(e) {
    const name = e.target.value.trim();
    this.editingFilter = {
      ...this.editingFilter,
      name
    };
  }

  handleNewExpressionChange(e) {
    const text = e.target.value;
    const { isValid, parsed, error } = this.validateJSON(text);
    this.editingFilter = {
      ...this.editingFilter,
      expression: text,
      isValid,
      parsed,
      error
    };
  }

  handleAddFilter() {
    console.log('Add filter clicked');
    this.editingFilter = {
      name: '',
      expression: JSON.stringify([
        {
          type: 'field',
          key: 'displayName',
          value: '',
          operator: 'equals',
          not: false
        }
      ], null, 2),
      isValid: true
    };
  }

  handleCancelEdit() {
    this.editingFilter = null;
  }

  handleSaveEdit = () => {
    if (this.editingFilter.isValid && this.editingFilter.name) {
      this.dispatchEvent(new CustomEvent('filter-create', {
        detail: {
          name: this.editingFilter.name,
          expression: this.editingFilter.expression
        }
      }));
      this.editingFilter = null;
    }
  }

  handleEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.target.blur();
    }
  }

  handleNameChange(e) {
    const filterId = e.target.closest('[data-filter-id]').dataset.filterId;
    const newName = e.target.textContent.trim();
    
    this.dispatchEvent(new CustomEvent('filter-update', {
      detail: {
        id: filterId,
        updates: { name: newName }
      }
    }));
  }

  handleExpressionChange(e) {
    const filterId = e.target.closest('[data-filter-id]').dataset.filterId;
    const newExpression = e.target.textContent.trim();
    
    this.dispatchEvent(new CustomEvent('filter-update', {
      detail: {
        id: filterId,
        updates: { expression: newExpression }
      }
    }));
  }
}

customElements.define('filter-queries', FilterQueries); 