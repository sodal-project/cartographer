import { Injectable, inject } from '@angular/core'
import { Firestore, collection, getDocs } from '@angular/fire/firestore'
import { GraphNode, GraphEdge } from '../models/cartographer.model'
import { Database } from '../models/brainy'
import { signal, WritableSignal } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class BrainyService {
  private firestore = inject(Firestore)

  // Signals to store the data
  private nodesSignal: WritableSignal<GraphNode[]> = signal([])
  private edgesSignal: WritableSignal<GraphEdge[]> = signal([])

  // Brainy database instances
  private nodesDb: any
  private edgesDb: any

  constructor() {
    // Initialize Brainy databases
    this.nodesDb = new Database({
      // Optional configuration for the database
      hnsw: {
        maxConnections: 16,  // Default HNSW parameter
        efConstruction: 200  // Default HNSW parameter
      }
    })
    this.edgesDb = new Database({
      // Optional configuration for the database
      hnsw: {
        maxConnections: 16,  // Default HNSW parameter
        efConstruction: 200  // Default HNSW parameter
      }
    })

    // Initialize the databases asynchronously
    this.initDatabases()
  }

  /**
   * Initializes the Brainy databases
   * @private
   */
  private async initDatabases(): Promise<void> {
    try {
      await this.nodesDb.init()
      await this.edgesDb.init()
      console.log('Brainy databases initialized successfully')
    } catch (error) {
      console.error('Error initializing Brainy databases:', error)
    }
  }

  /**
   * Fetches data from Firestore and stores it locally in Brainy
   * @param nodeCollection The name of the node collection in Firestore
   * @param edgeCollection The name of the edge collection in Firestore
   */
  async fetchAndStoreData(
    nodeCollection: string,
    edgeCollection: string
  ): Promise<void> {
    try {
      // Initialize Brainy databases if not already initialized
      if (!this.nodesDb.isInitialized) {
        await this.nodesDb.init();
      }
      if (!this.edgesDb.isInitialized) {
        await this.edgesDb.init();
      }

      // Fetch nodes from Firestore
      const nodesCol = collection(this.firestore, nodeCollection)
      const nodesSnapshot = await getDocs(nodesCol)

      if (!nodesSnapshot.empty) {
        const nodes: GraphNode[] = []
        const nodePromises = nodesSnapshot.docs.map(async (doc) => {
          const nodeData = doc.data() as GraphNode
          nodeData.id = doc.id
          nodes.push(nodeData)

          // Store in Brainy using add instead of put
          await this.nodesDb.add(nodeData, nodeData)
        })

        await Promise.all(nodePromises)

        // Update the signal
        this.nodesSignal.set(nodes)
      }

      // Fetch edges from Firestore
      const edgesCol = collection(this.firestore, edgeCollection)
      const edgesSnapshot = await getDocs(edgesCol)

      if (!edgesSnapshot.empty) {
        const edges: GraphEdge[] = []
        const edgePromises = edgesSnapshot.docs.map(async (doc) => {
          const edgeData = doc.data() as GraphEdge
          edgeData.id = doc.id
          edges.push(edgeData)

          // Store in Brainy using add instead of put
          await this.edgesDb.add(edgeData, edgeData)
        })

        await Promise.all(edgePromises)

        // Update the signal
        this.edgesSignal.set(edges)
      }
    } catch (error) {
      console.error('Error fetching and storing data:', error)
    }
  }

  /**
   * Gets all nodes from the local Brainy database
   * @returns A promise that resolves to an array of GraphNode objects
   */
  async getNodes(): Promise<GraphNode[]> {
    try {
      // Initialize if not already initialized
      if (!this.nodesDb.isInitialized) {
        await this.nodesDb.init();
      }

      // Get the current value from the signal as there's no direct getAll method
      // If the signal is empty, we'll return an empty array
      const nodes = this.nodesSignal();
      return nodes;
    } catch (error) {
      console.error('Error getting nodes from Brainy:', error)
      return []
    }
  }

  /**
   * Gets all edges from the local Brainy database
   * @returns A promise that resolves to an array of GraphEdge objects
   */
  async getEdges(): Promise<GraphEdge[]> {
    try {
      // Initialize if not already initialized
      if (!this.edgesDb.isInitialized) {
        await this.edgesDb.init();
      }

      // Get the current value from the signal as there's no direct getAll method
      // If the signal is empty, we'll return an empty array
      const edges = this.edgesSignal();
      return edges;
    } catch (error) {
      console.error('Error getting edges from Brainy:', error)
      return []
    }
  }

  /**
   * Searches for nodes in the local Brainy database
   * @param query The search query
   * @returns A promise that resolves to an array of matching GraphNode objects
   */
  async searchNodes(query: string): Promise<GraphNode[]> {
    try {
      if (!query.trim()) {
        return await this.getNodes()
      }

      const lowerQuery = query.toLowerCase()

      // Get all nodes from the signal and filter them manually
      const allNodes = this.nodesSignal();

      // Filter nodes based on the query
      const results = allNodes.filter((node: GraphNode) => {
        // Check if the node has data with displayName or handle
        if (node.data) {
          if (
            node.data.displayName &&
            node.data.displayName.toLowerCase().includes(lowerQuery)
          ) {
            return true
          }
          if (
            node.data.handle &&
            node.data.handle.toLowerCase().includes(lowerQuery)
          ) {
            return true
          }
        }
        return false
      });

      return results
    } catch (error) {
      console.error('Error searching nodes in Brainy:', error)
      return []
    }
  }

  /**
   * Gets the current value of the nodes signal
   * @returns An array of GraphNode objects
   */
  getNodesSignal(): WritableSignal<GraphNode[]> {
    return this.nodesSignal
  }

  /**
   * Gets the current value of the edges signal
   * @returns An array of GraphEdge objects
   */
  getEdgesSignal(): WritableSignal<GraphEdge[]> {
    return this.edgesSignal
  }

  /**
   * Stores a node in the local Brainy database
   * @param node The node to store
   */
  async storeNode(node: any): Promise<void> {
    try {
      // Initialize if not already initialized
      if (!this.nodesDb.isInitialized) {
        await this.nodesDb.init();
      }

      // Use add instead of put
      await this.nodesDb.add(node, node)

      // Update the signal with the new node
      const currentNodes = this.nodesSignal();
      const nodeExists = currentNodes.some((n: GraphNode) => n.id === node.id);

      if (!nodeExists) {
        // Add the new node to the signal
        this.nodesSignal.set([...currentNodes, node]);
      } else {
        // Update the existing node in the signal
        this.nodesSignal.set(
          currentNodes.map((n: GraphNode) => (n.id === node.id ? node : n))
        );
      }
    } catch (error) {
      console.error('Error storing node in Brainy:', error)
    }
  }

  /**
   * Stores an edge in the local Brainy database
   * @param edge The edge to store
   */
  async storeEdge(edge: any): Promise<void> {
    try {
      // Initialize if not already initialized
      if (!this.edgesDb.isInitialized) {
        await this.edgesDb.init();
      }

      // Use add instead of put
      await this.edgesDb.add(edge, edge)

      // Update the signal with the new edge
      const currentEdges = this.edgesSignal();
      const edgeExists = currentEdges.some((e: GraphEdge) => e.id === edge.id);

      if (!edgeExists) {
        // Add the new edge to the signal
        this.edgesSignal.set([...currentEdges, edge]);
      } else {
        // Update the existing edge in the signal
        this.edgesSignal.set(
          currentEdges.map((e: GraphEdge) => (e.id === edge.id ? edge : e))
        );
      }
    } catch (error) {
      console.error('Error storing edge in Brainy:', error)
    }
  }
}
