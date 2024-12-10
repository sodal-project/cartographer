class TestPingModule extends window.CoreClientModule {
  static moduleName = 'test-ping';

  async init() {
    this.shadowRoot.innerHTML = `
      <div class="p-4">
        <button class="bg-blue-500 text-white px-4 py-2 rounded">Ping</button>
        <span class="ml-4 text-white">Count: <span class="count">0</span></span>
      </div>
    `;

    const button = this.shadowRoot.querySelector('button');
    button.addEventListener('click', () => {
      fetch(`/mod/${this.constructor.moduleName}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: this.instanceId })
      });
    });

    // Subscribe to updates
    this.subscribe(data => {
      this.shadowRoot.querySelector('.count').textContent = data.count;
    });

    // Get initial state
    const initial = await this.fetchInitialState();
    this.shadowRoot.querySelector('.count').textContent = initial.count;
  }
}

window.CoreClientModule.define(TestPingModule); 