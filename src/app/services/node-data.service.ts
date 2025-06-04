import { Injectable } from '@angular/core';
import { BrainyData } from '@soulcraft/brainy';

@Injectable({
  providedIn: 'root'
})
export class NodeDataService {
  private brainyService = new BrainyData();
  private dataCache = new Map<string, any>();
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Initialize Brainy service
    this.initializationPromise = this.initialize();
  }

  /**
   * Initializes the BrainyData service
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('NodeDataService: Initializing BrainyData...');
      await this.brainyService.init();
      this.initialized = true;
      console.log('NodeDataService: BrainyData initialization complete');
    } catch (error) {
      console.error('Error initializing BrainyData service:', error);
      // Reset initialization promise so we can try again
      this.initializationPromise = null;
    }
  }

  /**
   * Returns a promise that resolves when the service is initialized
   */
  private async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    return this.initializationPromise || this.initialize();
  }

  /**
   * Get complete node data by ID
   * @param nodeId The ID of the node to fetch data for
   * @returns A promise that resolves to the complete node data
   */
  async getNodeData(nodeId: string): Promise<any> {
    // Check cache first
    if (this.dataCache.has(nodeId)) {
      return this.dataCache.get(nodeId);
    }

    try {
      // Wait for initialization to complete before fetching data
      await this.waitForInitialization();

      // If initialization failed, log a warning and return null
      if (!this.initialized) {
        console.warn(`Cannot fetch data for node ID ${nodeId}: BrainyData not initialized`);
        return null;
      }

      console.log(`Fetching data for node ID: ${nodeId}`);

      // Fetch data from Brainy using search with the ID
      // Wrap in try-catch to handle specific HNSW errors
      let searchResults;
      try {
        searchResults = await this.brainyService.search(nodeId, 1);
      } catch (searchError) {
        // Check if this is the "Neighbor not found" error
        if (searchError instanceof Error &&
            searchError.message &&
            searchError.message.includes('Neighbor with ID') &&
            searchError.message.includes('not found in pruneConnections')) {
          console.warn(`HNSW index error for node ID ${nodeId}: ${searchError.message}`);
          console.log('Attempting to reinitialize BrainyData to recover from HNSW index error');

          // Reset initialization state
          this.initialized = false;

          // Try to reinitialize
          await this.initialize();

          // If reinitialization failed, return null
          if (!this.initialized) {
            return null;
          }

          // Try search again after reinitialization
          try {
            searchResults = await this.brainyService.search(nodeId, 1);
          } catch (retryError) {
            console.error(`Failed to recover from HNSW index error for node ID ${nodeId}:`, retryError);
            return null;
          }
        } else {
          // For other search errors, log and return null
          console.error(`Error searching for node ID ${nodeId}:`, searchError);
          return null;
        }
      }

      // Check if we found a result with the matching ID
      const result = searchResults.find(item => item.id === nodeId);

      if (result) {
        console.log(`Found data for node ID: ${nodeId}`);

        // Format the data
        const nodeData = {
          id: result.id,
          ...result.metadata
        };

        // Cache the data
        this.dataCache.set(nodeId, nodeData);

        return nodeData;
      } else {
        console.warn(`No data found for node ID: ${nodeId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching data for node ID ${nodeId}:`, error);
      return null;
    }
  }

  /**
   * Clear the data cache
   */
  clearCache(): void {
    this.dataCache.clear();
  }
}
