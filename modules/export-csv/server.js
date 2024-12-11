import { CoreModule } from '../../core/core.js';
import { Parser } from 'json2csv';

class ExportCsv extends CoreModule {
  constructor() {
    super('export-csv');
  }

  async index(req) {
    return this.renderComponent('export-csv-module', {
      id: `export-csv-${req.instance || 'default'}`
    });
  }

  async getData({ instanceId }) {
    const state = await this.getState(instanceId);
    return state;
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

  // Main export functionality
  async exportCsv({ instanceId, filter }) {
    try {
      // Update state to show processing
      await this.setState(instanceId, { status: 'processing' });

      const params = { size: 100000 };
      const filterObj = filter ? JSON.parse(filter) : [];
      
      // Get personas from graph
      const results = await this.core.graph.readPersonas(filterObj, params);
      const personas = results.raw.records.map(node => node._fields[0].properties);
      
      // Generate CSV
      const fields = this.getUniqueProperties(personas);
      const parser = new Parser({ fields });
      const csv = parser.parse(personas);
      
      // Create response object
      const response = {
        file: csv,
        fileName: `personas_${this.getShortDate()}.csv`,
        type: 'text/csv'
      };

      // Update state with success
      await this.setState(instanceId, { 
        status: 'ready',
        lastExport: new Date().toISOString()
      });

      return response;

    } catch (error) {
      // Update state with error
      await this.setState(instanceId, { 
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }
}

export default new ExportCsv(); 