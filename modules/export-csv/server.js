import { CoreModule } from '../../core/core.js';
import { Parser } from 'json2csv';

class ExportCsv extends CoreModule {
  constructor() {
    super('export-csv');
  }

  async index({ instanceId }) {
    instanceId = instanceId || 'export-csv-default';
    
    // Initialize state if needed
    const state = await this.getState(instanceId);
    if (!state) {
      await this.setState(instanceId, { 
        status: 'ready',
        lastExport: null,
        error: null
      });
    }

    return this.renderComponent(instanceId);
  }

  // Main export functionality
  async exportCsv({ instanceId, filter }) {
    try {
      // Update state to show processing
      await this.setState(instanceId, { 
        status: 'processing',
        error: null 
      });
      await this.broadcastState({ instanceId });

      const params = { size: 100000 };
      const filterObj = filter ? JSON.parse(filter) : [];
      
      // Get personas from graph
      const results = await this.core.graph.readPersonas(filterObj, params);
      const personas = results.raw.records.map(node => node._fields[0].properties);
      
      // Generate CSV
      const fields = this.getUniqueProperties(personas);
      const parser = new Parser({ fields });
      const csv = parser.parse(personas);
      
      // Update state with success
      await this.setState(instanceId, { 
        status: 'ready',
        lastExport: new Date().toISOString(),
        error: null
      });
      await this.broadcastState({ instanceId });

      // Return file data
      return {
        file: csv,
        fileName: `personas_${this.getShortDate()}.csv`,
        type: 'text/csv'
      };

    } catch (error) {
      // Update state with error
      await this.setState(instanceId, { 
        status: 'error',
        error: error.message
      });
      await this.broadcastState({ instanceId });
      throw error;
    }
  }

  // Helper methods
  getUniqueProperties(objects) {
    const uniqueProperties = new Set();
    objects.forEach(obj => {
      Object.keys(obj).forEach(key => uniqueProperties.add(key));
    });
    return Array.from(uniqueProperties);
  }

  getShortDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}-${day}-${year}`;
  }

  async broadcastState({ instanceId }) {
    return await super.broadcastState({ instanceId });
  }
}

export default new ExportCsv(); 