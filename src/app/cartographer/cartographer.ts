import * as d3 from 'd3'
import { SimulationLinkDatum, SimulationNodeDatum } from 'd3'
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  NgZone,
  OnDestroy,
  runInInjectionContext,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core'
import { Firestore } from '@angular/fire/firestore'
import { Observable } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { BrainyService } from '../services/brainy.service'
import { MatIcon } from '@angular/material/icon'
import { MatInput } from '@angular/material/input'
import { MatIconButton } from '@angular/material/button'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { FormsModule } from '@angular/forms'

// Define interfaces for graph data (adjust as per your actual data structure)
interface D3Node {
  id: string
  group?: number // Optional group for coloring
  // Add other properties if they exist, like 'label' or 'name'
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface D3Edge {
  id: string
  source: string | D3Node // Can be ID or GraphNode object
  target: string | D3Node // Can be ID or GraphNode object
  // Add other properties if they exist
}

// D3 specific node and link types
interface Node extends d3.SimulationNodeDatum, D3Node {}

interface Edge extends d3.SimulationLinkDatum<Node> {
  source: string | Node // D3 expects source/target to be Node objects or IDs after processing
  target: string | Node
}

interface CustomNode extends Node {
  _graph_node: {
    embedding: Array<number>
  }
  data: {
    displayName: string
    handle: string
    avatar: string
    [key: string]: any
  }
}

@Component({
  selector: 'd3-cartographer',
  standalone: true,
  imports: [MatIcon, MatInput, MatIconButton, MatProgressSpinner, FormsModule],
  template: `
    @if (isOffline()) {
      <div class="offline-indicator">
        <mat-icon>cloud_off</mat-icon>
        <span>You are offline. The graph is displaying cached data.</span>
      </div>
    }
    <div class="search-container">
      <div class="search-boxes">
        <!-- Vector Search Box -->
        <form
          (submit)="performVectorSearch()"
          autocomplete="off"
          class="search-form">
          <div class="search-box">
            <input
              matInput
              class="search-input"
              [(ngModel)]="searchQuery"
              name="search"
              placeholder="Search Selected Services..."
              (keyup.enter)="performVectorSearch()"
              autocomplete="off" />
            @if (isSearching()) {
              <mat-spinner diameter="24" class="search-spinner"></mat-spinner>
            } @else {
              <button
                mat-icon-button
                type="submit"
                class="search-btn"
                aria-label="Search Selected Services">
                <mat-icon>cloud_search</mat-icon>
              </button>
            }
          </div>
        </form>

        <!-- Filter Search Box -->
        <form
          (submit)="filterCurrentGraph()"
          autocomplete="off"
          class="search-form">
          <div class="search-box">
            <input
              matInput
              class="search-input"
              [(ngModel)]="filterQuery"
              name="filter"
              placeholder="Filter current graph..."
              (keyup.enter)="filterCurrentGraph()"
              (keyup)="filterCurrentGraph()"
              autocomplete="off" />
            <button
              mat-icon-button
              type="submit"
              class="search-btn"
              aria-label="Filter Graph">
              <mat-icon>filter_alt</mat-icon>
            </button>
          </div>
        </form>
      </div>

      @if (searchResults().length > 0) {
        <div class="search-results-actions">
          <div class="search-results-count">
            Found {{ searchResults().length }} results
          </div>
          <div class="search-actions">
            <button
              class="action-button"
              (click)="toggleNodeVisibility()"
              [title]="
                hideNonMatching()
                  ? 'Show all nodes (dimmed)'
                  : 'Hide non-matching nodes'
              ">
              <mat-icon
                >{{ hideNonMatching() ? 'visibility' : 'visibility_off' }}
              </mat-icon>
            </button>
            <button
              class="action-button"
              (click)="resetSearch()"
              title="Reset search">
              <mat-icon>restart_alt</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>
    <div class="zoom-controls">
      <button
        class="zoom-fit-button"
        (click)="zoomToFit()"
        title="Zoom to fit all nodes">
        <mat-icon>fit_screen</mat-icon>
      </button>
    </div>
    <div #container class="graph-container"></div>
  `,
  styleUrls: ['./cartographer.component.sass']
})
export class Cartographer implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true })
  containerRef!: ElementRef<HTMLDivElement>
  // We no longer need the subscription since we're using signals

  // Convert to signals
  private graphNodes: WritableSignal<D3Node[]> = signal([])
  private graphEdges: WritableSignal<D3Edge[]> = signal([])
  public isOffline: WritableSignal<boolean> = signal(!navigator.onLine)

  // References for zoom functionality
  private svgElement: d3.Selection<
    SVGSVGElement,
    unknown,
    null,
    undefined
  > | null = null
  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
  private nodes: CustomNode[] = []
  private nodeSize: { width: number; height: number } = {
    width: 160,
    height: 48
  }

  // Reference to the active popup
  private activePopup: d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null = null

  // Computed signal for D3 data
  private d3Data = computed(() => this.toD3Data())

  // Use inject for dependency injection
  private firestore = inject(Firestore)
  private zone = inject(NgZone)
  private injector = inject(Injector)
  private brainyService = inject(BrainyService)

  // Store references to event listener functions for cleanup
  private onlineListener = () => this.isOffline.set(false)
  private offlineListener = () => this.isOffline.set(true)
  private resizeListener = () => {
    if (this.isVisible()) {
      this.zoomToFit()
    }
  }

  // Track if the component is visible
  private isVisible: WritableSignal<boolean> = signal(false)
  // Observer for visibility changes
  private resizeObserver: ResizeObserver | null = null

  // Search functionality
  searchQuery = signal('')
  filterQuery = signal('')
  isSearching = signal(false)
  searchResults = signal<CustomNode[]>([])
  hideNonMatching = signal(false) // Track whether to hide or dim non-matching nodes

  // Track original nodes and hidden nodes for search functionality
  private originalNodeElements: d3.Selection<
    SVGGElement,
    CustomNode,
    d3.BaseType,
    unknown
  > | null = null
  private hiddenNodeElements: d3.Selection<
    SVGGElement,
    CustomNode,
    d3.BaseType,
    unknown
  >[] = []
  private originalEdgeElements: d3.Selection<
    SVGLineElement,
    Edge,
    d3.BaseType,
    unknown
  > | null = null
  private hiddenEdgeElements: d3.Selection<
    SVGLineElement,
    Edge,
    d3.BaseType,
    unknown
  >[] = []

  /**
   * Calculates the cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity score (1 = identical, 0 = orthogonal, -1 = opposite)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Finds the nearest nodes to a query embedding using cosine similarity
   * @param queryEmbedding The query embedding vector
   * @param nodes The nodes to search
   * @param limit Maximum number of results to return
   * @returns Array of nodes sorted by similarity (most similar first)
   */
  private findNearest(
    queryEmbedding: number[],
    nodes: CustomNode[],
    limit: number = 10
  ): CustomNode[] {
    // Filter nodes that have embeddings
    const nodesWithEmbeddings = nodes.filter(
      (node: CustomNode) =>
        node.data &&
        node._graph_node.embedding &&
        node._graph_node.embedding.length > 0
    )

    // Calculate similarity scores
    const scoredNodes = nodesWithEmbeddings.map((node) => ({
      node,
      score: this.cosineSimilarity(queryEmbedding, node._graph_node.embedding!)
    }))

    // Sort by similarity score (highest first)
    scoredNodes.sort((a, b) => b.score - a.score)

    // Return the top results
    return scoredNodes.slice(0, limit).map((item) => item.node)
  }

  /**
   * Generates a simple embedding for a text query
   * This is a placeholder for a real embedding generation service
   * In a production environment, this would use a proper embedding model
   * @param text The text to generate an embedding for
   * @returns A simple embedding vector
   */
  private generateQueryEmbedding(text: string): number[] {
    // This is a very simple placeholder embedding generation
    // In a real implementation, this would call an embedding service

    // Convert text to lowercase and remove punctuation
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '')

    // Split into words
    const words = cleanText.split(/\s+/)

    // Create a simple embedding (128 dimensions)
    // This is just a placeholder that creates a pseudo-random vector based on the text
    const embedding = new Array(128).fill(0)

    // For each word, update the embedding
    for (const word of words) {
      let hash = 0
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i)
        hash |= 0 // Convert to 32bit integer
      }

      // Use the hash to influence several dimensions
      for (let i = 0; i < 8; i++) {
        const index = Math.abs(hash + i * 16) % embedding.length
        embedding[index] += 1
      }
    }

    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm
      }
    }

    return embedding
  }

  /**
   * Performs a vector search using the current search query
   * Uses Brainy's local search capabilities to find nodes with similar embeddings
   */
  async performVectorSearch(): Promise<void> {
    const query = this.searchQuery().trim()
    if (!query) return

    this.isSearching.set(true)

    try {
      // Use Brainy service to search nodes locally
      const searchResults = await this.brainyService.searchNodes(query);

      // Convert to CustomNode type
      const results = searchResults as unknown as CustomNode[];

      this.searchResults.set(results)

      // Highlight the search results in the graph
      this.highlightSearchResults(results)

      console.log(`Found ${results.length} results for "${query}"`)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      this.isSearching.set(false)
    }
  }

  /**
   * Filters the current graph nodes based on the filter query
   * Uses Brainy's local filtering capabilities
   */
  async filterCurrentGraph(): Promise<void> {
    const query = this.filterQuery().trim()

    // If query is empty, reset the search
    if (!query) {
      this.resetSearch()
      return
    }

    try {
      // Use Brainy service to filter nodes locally
      const searchResults = await this.brainyService.searchNodes(query);

      // Convert to CustomNode type
      const results = searchResults as unknown as CustomNode[];

      this.searchResults.set(results)

      // Highlight the search results in the graph
      this.highlightSearchResults(results)

      console.log(`Filtered to ${results.length} nodes matching "${query}"`)
    } catch (error) {
      console.error('Filter error:', error)
    }
  }

  /**
   * Highlights the search results in the graph
   * @param results The search results to highlight
   */
  private highlightSearchResults(results: CustomNode[]): void {
    if (!this.svgElement) return

    console.log(
      'Highlighting search results - hideNonMatching:',
      this.hideNonMatching()
    )
    console.log('Number of results:', results.length)

    // If we have hidden nodes from a previous search, restore them first
    this.restoreHiddenElements()

    // Reset all nodes to default appearance
    this.svgElement
      .selectAll<SVGGElement, CustomNode>('.node-group')
      .classed('search-result', false)
      .style('opacity', null) // Reset any directly applied opacity

    if (results.length === 0) return

    // Get the IDs of the search results
    const resultIds = new Set(results.map((node) => node.id))
    console.log('Result IDs:', Array.from(resultIds))

    // Count nodes before applying classes
    const nodeCount = this.svgElement.selectAll('.node-group').size()
    console.log('Total node count:', nodeCount)

    // Highlight the search results
    this.svgElement
      .selectAll<SVGGElement, CustomNode>('.node-group')
      .classed('search-result', (d) => resultIds.has(d.id))

    // If hideNonMatching is false, dim non-matching nodes by setting opacity directly
    if (!this.hideNonMatching()) {
      // Select non-matching nodes and set opacity to dim them
      this.svgElement
        .selectAll<SVGGElement, CustomNode>('.node-group')
        .filter((d) => !resultIds.has(d.id))
        .style('opacity', '0.3') // Dim non-matching nodes

      // Also dim edges that don't connect to matching nodes
      this.svgElement
        .selectAll<SVGLineElement, Edge>('.edges line')
        .each((d, i, edges) => {
          const edge = d as Edge
          const sourceId =
            typeof edge.source === 'string'
              ? edge.source
              : (edge.source as CustomNode).id
          const targetId =
            typeof edge.target === 'string'
              ? edge.target
              : (edge.target as CustomNode).id
          const isNonMatching =
            !resultIds.has(sourceId) || !resultIds.has(targetId)

          if (isNonMatching) {
            d3.select(edges[i]).style('stroke-opacity', '0.2')
          }
        })
    }
    // If hideNonMatching is true, actually remove the non-matching nodes from the DOM
    else {
      console.log('Removing non-matching nodes from DOM')

      // Store a reference to all nodes before removing any
      if (!this.originalNodeElements) {
        this.originalNodeElements = this.svgElement
          .select('.nodes')
          .selectAll('.node-group')
      }

      // Select non-matching nodes
      const nonMatchingNodes = this.svgElement
        .selectAll('.node-group')
        .filter((d) => !resultIds.has((d as CustomNode).id))

      // Remove them
      nonMatchingNodes.each((d, i, nodes) => {
        const node = d3.select(nodes[i])
        console.log('Removing node:', (d as CustomNode).id)
        node.remove()
      })

      // Handle edges - remove edges that don't connect to matching nodes
      if (!this.originalEdgeElements) {
        this.originalEdgeElements = this.svgElement
          .select('.edges')
          .selectAll<SVGLineElement, Edge>('line')
      }

      this.svgElement.selectAll('.edges line').each((d, i, edges) => {
        const edge = d as Edge
        const sourceId =
          typeof edge.source === 'string'
            ? edge.source
            : (edge.source as CustomNode).id
        const targetId =
          typeof edge.target === 'string'
            ? edge.target
            : (edge.target as CustomNode).id
        const isNonMatching =
          !resultIds.has(sourceId) || !resultIds.has(targetId)

        if (isNonMatching) {
          const edgeElement = d3.select(edges[i])
          console.log('Removing edge:', sourceId, '->', targetId)
          edgeElement.remove()
        }
      })

      // Get the data for the remaining nodes
      const remainingNodes = this.nodes.filter((node) => resultIds.has(node.id))

      // Restart the simulation with just the matched nodes
      const simulation = d3
        .forceSimulation<CustomNode>(remainingNodes)
        .force(
          'link',
          d3
            .forceLink<CustomNode, SimulationLinkDatum<CustomNode>>(
              this.d3Data().edges.filter((edge) => {
                const sourceId =
                  typeof edge.source === 'string'
                    ? edge.source
                    : (edge.source as CustomNode).id
                const targetId =
                  typeof edge.target === 'string'
                    ? edge.target
                    : (edge.target as CustomNode).id
                return resultIds.has(sourceId) && resultIds.has(targetId)
              }) as SimulationLinkDatum<CustomNode>[]
            )
            .id((d) => d.id)
            .distance(180) // Reduced distance for tighter layout
            .strength(0.3) // Increased strength for stronger connections
        )
        .force('charge', d3.forceManyBody().strength(-500)) // Reduced repulsion for tighter layout
        .force(
          'center',
          d3.forceCenter(
            this.containerRef.nativeElement.offsetWidth / 2,
            this.containerRef.nativeElement.offsetHeight / 2
          )
        )
        .force(
          'collision',
          d3.forceCollide().radius(
            Math.max(this.nodeSize.width, this.nodeSize.height) / 2 + 10 // Reduced padding for tighter layout
          )
        )

      // Update node positions on each tick
      simulation.on('tick', () => {
        this.svgElement
          ?.selectAll<SVGLineElement, Edge>('.edges line')
          .attr('x1', (d: Edge) => (d.source as CustomNode).x!)
          .attr('y1', (d: Edge) => (d.source as CustomNode).y!)
          .attr('x2', (d: Edge) => (d.target as CustomNode).x!)
          .attr('y2', (d: Edge) => (d.target as CustomNode).y!)

        this.svgElement
          ?.selectAll<SVGGElement, CustomNode>('.node-group')
          .attr('transform', (d: CustomNode) => {
            return `translate(${d.x!},${d.y!})`
          })
      })

      // Zoom to fit the remaining nodes after a short delay
      setTimeout(() => {
        this.zoomToFit()
      }, 300)
    }

    // If there are search results, zoom to fit them
    if (results.length > 0) {
      this.zoomToNodes(results)
    }
  }

  /**
   * Restores hidden nodes and edges to the DOM
   */
  private restoreHiddenElements(): void {
    if (!this.svgElement) return

    // If we have original node elements, recreate the graph
    if (this.originalNodeElements || this.originalEdgeElements) {
      console.log('Recreating graph to restore hidden elements')
      this.createGraph()
    }

    // Clear any existing hidden elements arrays
    this.hiddenNodeElements = []
    this.hiddenEdgeElements = []

    // Reset the original elements references
    this.originalNodeElements = null
    this.originalEdgeElements = null
  }

  /**
   * Toggles between hiding and dimming non-matching nodes
   */
  toggleNodeVisibility(): void {
    this.hideNonMatching.update((value) => !value)
    console.log('Toggle visibility - hideNonMatching:', this.hideNonMatching())
    // Re-apply highlighting with the new visibility setting
    this.highlightSearchResults(this.searchResults())
  }

  /**
   * Resets the search results and shows all nodes
   */
  resetSearch(): void {
    this.searchQuery.set('')
    this.searchResults.set([])
    this.hideNonMatching.set(false)

    console.log('Resetting search results')

    // Restore any hidden nodes and edges
    this.restoreHiddenElements()

    // Reset all nodes to default appearance
    if (this.svgElement) {
      // Reset node classes and styles
      this.svgElement
        .selectAll<SVGGElement, CustomNode>('.node-group')
        .classed('search-result', false)
        .style('opacity', null) // Reset any directly applied opacity

      // Reset edge styles
      this.svgElement
        .selectAll<SVGLineElement, Edge>('.edges line')
        .style('stroke-opacity', null) // Reset any directly applied stroke-opacity

      // Verify that all nodes are visible
      const nodeCount = this.svgElement.selectAll('.node-group').size()
      console.log('Total nodes after reset:', nodeCount)

      // Restart the simulation with all nodes
      const simulation = d3
        .forceSimulation<CustomNode>(this.nodes)
        .force(
          'link',
          d3
            .forceLink<CustomNode, SimulationLinkDatum<CustomNode>>(
              this.d3Data().edges as SimulationLinkDatum<CustomNode>[]
            )
            .id((d) => d.id)
            .distance(280)
            .strength(0.2)
        )
        .force('charge', d3.forceManyBody().strength(-1000))
        .force(
          'center',
          d3.forceCenter(
            this.containerRef.nativeElement.offsetWidth / 2,
            this.containerRef.nativeElement.offsetHeight / 2
          )
        )
        .force(
          'collision',
          d3
            .forceCollide()
            .radius(
              Math.max(this.nodeSize.width, this.nodeSize.height) / 2 + 30
            )
        )

      // Update node positions on each tick
      simulation.on('tick', () => {
        this.svgElement
          ?.selectAll<SVGLineElement, Edge>('.edges line')
          .attr('x1', (d: Edge) => (d.source as CustomNode).x!)
          .attr('y1', (d: Edge) => (d.source as CustomNode).y!)
          .attr('x2', (d: Edge) => (d.target as CustomNode).x!)
          .attr('y2', (d: Edge) => (d.target as CustomNode).y!)

        this.svgElement
          ?.selectAll<SVGGElement, CustomNode>('.node-group')
          .attr('transform', (d: CustomNode) => {
            return `translate(${d.x!},${d.y!})`
          })
      })

      // Zoom to fit all nodes
      setTimeout(() => {
        this.zoomToFit()
      }, 300)
    }
  }

  /**
   * Zooms to fit the specified nodes in the view
   * @param nodes The nodes to zoom to
   */
  private zoomToNodes(nodes: CustomNode[]): void {
    if (!this.svgElement || !this.zoomBehavior || nodes.length === 0) return

    // Use smaller padding when hiding non-matching nodes to maximize screen space
    const padding = this.hideNonMatching() ? 20 : 50

    // Calculate the bounding box of the nodes
    const bounds = {
      minX: Math.min(...nodes.map((n) => n.x! - this.nodeSize.width / 2)),
      minY: Math.min(...nodes.map((n) => n.y! - this.nodeSize.height / 2)),
      maxX: Math.max(...nodes.map((n) => n.x! + this.nodeSize.width / 2)),
      maxY: Math.max(...nodes.map((n) => n.y! + this.nodeSize.height / 2))
    }

    // Add padding
    bounds.minX -= padding
    bounds.minY -= padding
    bounds.maxX += padding
    bounds.maxY += padding

    // Get the dimensions of the container
    const containerWidth = this.containerRef.nativeElement.clientWidth
    const containerHeight = this.containerRef.nativeElement.clientHeight

    // Calculate the scale to fit the nodes
    const dx = bounds.maxX - bounds.minX
    const dy = bounds.maxY - bounds.minY
    const scale = Math.min(containerWidth / dx, containerHeight / dy)

    // Calculate the center of the bounding box
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2

    // Apply the zoom transform
    this.svgElement
      .transition()
      .duration(750)
      .call(
        this.zoomBehavior.transform,
        d3.zoomIdentity
          .translate(containerWidth / 2, containerHeight / 2)
          .scale(scale)
          .translate(-centerX, -centerY)
      )
  }

  constructor() {
    // Set up event listeners for online/offline status
    window.addEventListener('online', this.onlineListener)
    window.addEventListener('offline', this.offlineListener)
    // Set up the event listener for window resize
    window.addEventListener('resize', this.resizeListener)

    // Set up an effect to create the graph when data changes
    effect(() => {
      const data = this.d3Data()
      if (data.nodes.length > 0 && this.containerRef?.nativeElement) {
        this.zone.runOutsideAngular(() => {
          // Initialize the graph if the component is visible or force initialization
          if (this.isVisible()) {
            this.createGraph()
          }
        })
      }
    })
  }

  ngAfterViewInit() {
    // Fetch data from Firestore and store it locally using BrainyService
    this.brainyService.fetchAndStoreData('Profiles', 'edges').then(() => {
      // Get the signals from BrainyService
      const nodesSignal = this.brainyService.getNodesSignal();
      const edgesSignal = this.brainyService.getEdgesSignal();

      // Set up an effect to update our signals when the data changes
      effect(() => {
        this.graphNodes.set(nodesSignal() as D3Node[]);
        this.graphEdges.set(edgesSignal() as D3Edge[]);

        // If the graph is already created, zoom to fit when data changes
        if (this.svgElement && this.zoomBehavior && this.isVisible()) {
          // Use setTimeout to allow the graph to update first
          setTimeout(() => this.zoomToFit(), 500)
        }
      });
    });

    // Set up ResizeObserver to detect when the component becomes visible
    this.setupVisibilityDetection()
  }

  private setupVisibilityDetection(): void {
    // Create a ResizeObserver to detect when the container gets dimensions
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          // Component is now visible with dimensions
          this.isVisible.set(true)

          // If we have data, create the graph
          if (this.d3Data().nodes.length > 0) {
            this.zone.runOutsideAngular(() => {
              this.createGraph()
            })
          }
        }
      }
    })

    // Start observing the container
    if (this.containerRef?.nativeElement) {
      this.resizeObserver.observe(this.containerRef.nativeElement)
    }
  }

  private toD3Data(): { nodes: CustomNode[]; edges: Edge[] } {
    // Get the current values from the signals
    const graphNodes = this.graphNodes()
    const graphEdges = this.graphEdges()

    // Transform GraphNode objects to match the CustomNode interface expected by D3
    const nodes: CustomNode[] = graphNodes.map((n) => {
      // Create a copy of the node with the data property structured as expected by D3
      return n as CustomNode
    })

    const edges: Edge[] = graphEdges.map(
      (e) =>
        ({
          source:
            typeof e.source === 'string' ? e.source : (e.source as D3Node).id,
          target:
            typeof e.target === 'string' ? e.target : (e.target as D3Node).id
        }) as Edge
    )
    return { nodes, edges }
  }

  createGraph() {
    d3.select(this.containerRef.nativeElement).select('svg').remove()

    // Get data from the computed signal
    const { nodes, edges } = this.d3Data()

    // Check if we have nodes to display
    if (!nodes.length) return
    const width = this.containerRef.nativeElement.offsetWidth
    const height = this.containerRef.nativeElement.offsetHeight

    // Store references for zoomToFit method
    this.svgElement = null
    this.zoomBehavior = null
    this.nodes = nodes
    this.nodeSize = { width: 280, height: 80 } // Increased width to accommodate longer displayNames

    // Material Design 3 Inspired Colors (Light Theme)
    const md3Colors = {
      primary: '#6750A4',
      onPrimary: '#FFFFFF',
      secondaryContainer: '#E8DEF8',
      onSecondaryContainer: '#1D192B',
      outline: '#79747E',
      surface: '#FFFBFE', // For node background if not using vibrant colors
      shadow: 'rgba(0, 0, 0, 0.3)'
    }

    // Palette for nodes if groups are used
    const nodeColorPalette = [
      md3Colors.primary,
      '#4A5BF5',
      '#278853',
      '#A83A57',
      '#D56A2C',
      '#5D517F'
    ]

    const svg = d3
      .select(this.containerRef.nativeElement)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#F7F2FA') // Light Material background

    // Store reference to SVG element
    this.svgElement = svg as d3.Selection<
      SVGSVGElement,
      unknown,
      null,
      undefined
    >

    const defs = svg.append('defs')
    defs
      .append('filter')
      .attr('id', 'md-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
      .append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-color', md3Colors.shadow)
      .attr('flood-opacity', '0.15')

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        graphContainer.attr('transform', event.transform)
      })

    // Store reference to zoom behavior
    this.zoomBehavior = zoomBehavior

    svg.call(zoomBehavior as any)

    const graphContainer = svg
      .append('g')
      .attr('class', 'graph-content-container')

    const link = graphContainer
      .append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', md3Colors.outline)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1.5)

    // Adjust node size for contact card layout
    const nodeSize = { width: 280, height: 80 } // Increased width to accommodate longer displayNames
    const nodeRadius = 8 // For rounded corners
    const avatarRadius = 20 // Size of the circular avatar

    const node = graphContainer
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')

    // Create a clip path for circular avatars
    // const clipPaths = defs
    //   .selectAll('.avatar-clip')
    //   .data(nodes)
    //   .enter()
    //   .append('clipPath')
    //   .attr('id', (d) => `avatar-clip-${d.id}`)
    //   .append('circle')
    //   .attr('r', avatarRadius)
    //   .attr('cx', 0)
    //   .attr('cy', 0)

    // Add card background with squared left corners and rounded right corners
    node
      .append('path')
      .attr('d', (d) => {
        const w = nodeSize.width
        const h = nodeSize.height
        const r = nodeRadius
        const x = -w / 2
        const y = -h / 2

        // Path with squared left corners and rounded right corners
        return `
          M ${x},${y}
          h ${w - r}
          a ${r},${r} 0 0 1 ${r},${r}
          v ${h - 2 * r}
          a ${r},${r} 0 0 1 ${-r},${r}
          h ${-(w - r)}
          v ${-h}
          z
        `
      })
      .attr(
        'fill',
        (d) => nodeColorPalette[(d.group || 0) % nodeColorPalette.length]
      )
      .attr('stroke', md3Colors.outline)
      .attr('stroke-width', 0.5)
      .style('filter', 'url(#md-shadow)')

    // Add avatar image (filling left side of node box)
    node
      .append('image')
      .attr('x', -nodeSize.width / 2) // Position at the left edge of the card
      .attr('y', -nodeSize.height / 2) // Position at the top edge of the card
      .attr('width', nodeSize.height) // Width equals height to make it square
      .attr('height', nodeSize.height) // Full height of the node
      // .attr('clip-path', (d) => `url(#avatar-clip-${d.id})`)
      .attr('xlink:href', (d) => {
        // Debug: Log the avatar URL
        return (d as CustomNode).data?.avatar
      })
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .on('error', function () {
        // If the image fails to load, replace with a default avatar
        d3.select(this).attr(
          'xlink:href',
          'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
        )
      })

    // Add separator line between avatar and text
    node
      .append('line')
      .attr('x1', -nodeSize.width / 2 + nodeSize.height) // Right edge of avatar
      .attr('y1', -nodeSize.height / 2) // Top of node
      .attr('x2', -nodeSize.width / 2 + nodeSize.height) // Right edge of avatar
      .attr('y2', nodeSize.height / 2) // Bottom of node
      .attr('stroke', md3Colors.outline)
      .attr('stroke-width', 0.5)

    // Calculate available width for text (card width minus avatar width and margins)
    const avatarWidth = nodeSize.height // Avatar is now square with width = height
    const textMargin = 15 // Margin between separator line and text
    const textAvailableWidth = nodeSize.width - avatarWidth - textMargin - 10 // 10px for right margin

    // Function to truncate text with ellipsis if it exceeds available width
    const truncateText = (
      text: string,
      availableWidth: number,
      fontSize: number
    ) => {
      // Approximate character width (varies by font)
      const avgCharWidth = fontSize * 0.6
      const maxChars = Math.floor(availableWidth / avgCharWidth)

      if (text.length > maxChars) {
        return text.substring(0, maxChars - 3) + '...'
      }
      return text
    }

    // Add name text
    node
      .append('text')
      .text((d) => {
        const displayName =
          (d as CustomNode).data?.displayName ||
          (d as CustomNode).data?.handle ||
          ''
        return truncateText(displayName, textAvailableWidth, 12)
      })
      .attr('x', -nodeSize.width / 2 + avatarWidth + textMargin) // Position to the right of the separator line with margin
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', md3Colors.onPrimary)
      .style('pointer-events', 'none')
      .style('text-overflow', 'ellipsis') // Ensure text doesn't leak outside
      .style('white-space', 'nowrap')

    // Add email text (handle) - ensuring it's fully visible without truncation
    node
      .append('text')
      .text((d) => {
        return truncateText(
          (d as CustomNode).data?.handle || '',
          textAvailableWidth,
          10
        ) // Truncate if needed
      })
      .attr('x', -nodeSize.width / 2 + avatarWidth + textMargin) // Position to the right of the separator line with margin
      .attr('y', 10)
      .attr('text-anchor', 'start')
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '12px')
      .style('fill', md3Colors.onPrimary)
      .style('pointer-events', 'none')
      .style('text-overflow', 'ellipsis') // Ensure text doesn't leak outside
      .style('white-space', 'nowrap')

    node
      .on('mouseover', (event) => {
        const element = d3.select(event.currentTarget)
        element.select('rect').attr('fill-opacity', 0.85)
        element
          .transition()
          .duration(150)
          .attr('transform', function (d) {
            const node = d as CustomNode
            if (
              typeof node.x === 'undefined' ||
              typeof node.y === 'undefined'
            ) {
              return 'translate(0, 0) scale(1.05)'
            }
            return `translate(${node.x}, ${node.y}) scale(1.05)`
          })
      })
      .on('mouseout', (event) => {
        const element = d3.select(event.currentTarget)
        element.select('rect').attr('fill-opacity', 1)
        element
          .transition()
          .duration(150)
          .attr('transform', function (d) {
            const node = d as CustomNode
            if (
              typeof node.x === 'undefined' ||
              typeof node.y === 'undefined'
            ) {
              return 'translate(0, 0) scale(1)'
            }
            return `translate(${node.x}, ${node.y}) scale(1)`
          })
      })
      .on('click', (event, d) => {
        // Remove any existing popup
        if (this.activePopup) {
          this.activePopup.remove()
          this.activePopup = null
        }

        // Create popup for the clicked node
        const customNode = d as CustomNode
        this.createNodeInfoPopup(graphContainer, customNode, event)
      })

    const simulation = d3
      .forceSimulation<CustomNode>(nodes as CustomNode[])
      .force(
        'link',
        d3
          .forceLink<CustomNode, SimulationLinkDatum<CustomNode>>(
            edges as SimulationLinkDatum<CustomNode>[]
          )
          .id((d) => d.id)
          .distance(280) // Increased distance to account for wider nodes (matching node width)
          .strength(0.2)
      )
      .force('charge', d3.forceManyBody().strength(-1000)) // Increased strength to push nodes further apart
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3
          .forceCollide()
          .radius(Math.max(nodeSize.width, nodeSize.height) / 2 + 30) // Increased radius to prevent overlap
      )

    simulation.on('tick', () => {
      link
        .attr('x1', (d: Edge) => (d.source as CustomNode).x!)
        .attr('y1', (d: Edge) => (d.source as CustomNode).y!)
        .attr('x2', (d: Edge) => (d.target as CustomNode).x!)
        .attr('y2', (d: Edge) => (d.target as CustomNode).y!)
      node.attr('transform', (d: CustomNode) => {
        return `translate(${d.x!},${d.y!})`
      })
    })

    // Center graph on startup
    // Wait for a few ticks of the simulation for a more stable layout before centering.
    setTimeout(() => {
      this.zoomToFit()
    }, 300) // Increased timeout for simulation to stabilize more
  }

  /**
   * Creates an info popup for a node showing all its data
   * @param container The SVG container to add the popup to
   * @param node The node to show data for
   * @param event The click event that triggered the popup
   */
  private createNodeInfoPopup(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    node: CustomNode,
    event: MouseEvent
  ) {
    // Material Design 3 Inspired Colors
    const md3Colors = {
      surface: '#FFFFFF',
      onSurface: '#1C1B1F',
      outline: '#79747E',
      primary: '#6750A4',
      primaryDark: '#4F378B', // Darker complementary color for title bar
      onPrimaryDark: '#FFFFFF', // Text color for dark background
      shadow: 'rgba(0, 0, 0, 0.3)',
      labelBackground: '#F5F5F5' // Light gray for label background
    }

    // Create a group for the popup
    const popup = container.append('g').attr('class', 'node-info-popup')
    this.activePopup = popup as d3.Selection<
      SVGGElement,
      unknown,
      null,
      undefined
    >

    // Position popup relative to the node instead of mouse position
    // Align left edge of popup with left edge of node box
    // Position popup just below the node box with a small space
    const popupX = node.x! - this.nodeSize.width / 2
    const popupY = node.y! + this.nodeSize.height / 2 + 10

    // Popup dimensions
    const popupWidth = 500 // Increased from 450 to 500 for even wider popup
    const popupHeight = 400
    const padding = 16
    const labelWidth = 150 // Width for the label area increased from 120 to 150

    // Create popup background
    popup
      .append('rect')
      .attr('width', popupWidth)
      .attr('height', popupHeight)
      .attr('x', popupX)
      .attr('y', popupY)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', md3Colors.surface)
      .attr('stroke', md3Colors.outline)
      .attr('stroke-width', 1)
      .style('filter', 'url(#md-shadow)')

    // Add title bar background with rounded top corners and straight bottom using a path
    const titleBarHeight = 40
    const cornerRadius = 8

    // Create a path with rounded top corners and straight bottom
    popup
      .append('path')
      .attr(
        'd',
        `
        M ${popupX + cornerRadius} ${popupY}
        H ${popupX + popupWidth - cornerRadius}
        Q ${popupX + popupWidth} ${popupY} ${popupX + popupWidth} ${popupY + cornerRadius}
        V ${popupY + titleBarHeight}
        H ${popupX}
        V ${popupY + cornerRadius}
        Q ${popupX} ${popupY} ${popupX + cornerRadius} ${popupY}
        Z
      `
      )
      .attr('fill', md3Colors.primaryDark) // Use the darker complementary color

    // Add title (left-aligned but vertically centered in title bar) - using node's displayName
    popup
      .append('text')
      .attr('x', popupX + padding) // Left-aligned with padding
      .attr('y', popupY + titleBarHeight / 2) // Properly center vertically in the title bar
      .text(node.data?.displayName || node.data?.handle || 'Node Information')
      .attr('text-anchor', 'start') // Left-align the text
      .attr('dominant-baseline', 'middle') // Vertical alignment
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', md3Colors.onPrimaryDark) // Use contrasting text color

    // Add close button (mat-icon-button style)
    const closeButton = popup
      .append('g')
      .attr('class', 'close-button')
      .style('cursor', 'pointer')
      .on('click', () => {
        if (this.activePopup) {
          this.activePopup.remove()
          this.activePopup = null
          // Zoom back out when closing popup
          this.zoomToFit()
        }
      })

    // Button background with hover state
    const buttonCircle = closeButton
      .append('circle')
      .attr('cx', popupX + popupWidth - padding - 4) // Adjusted position
      .attr('cy', popupY + titleBarHeight / 2) // Center vertically in the title bar
      .attr('r', 18) // Larger radius for mat-icon-button style
      .attr('fill', 'transparent') // Initially transparent
      .attr('stroke', 'none')

    // Close icon (using 'close' symbol instead of '×')
    closeButton
      .append('text')
      .attr('x', popupX + popupWidth - padding - 4) // Adjusted position
      .attr('y', popupY + titleBarHeight / 2) // Center vertically in the title bar
      .text('✕') // Using a more standard close icon
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle') // Ensure vertical alignment matches title text
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', md3Colors.onPrimaryDark) // Match title text color
      .style('pointer-events', 'none')

    // Add hover effects
    closeButton
      .on('mouseenter', function () {
        buttonCircle.attr('fill', 'rgba(255, 255, 255, 0.12)') // Material ripple effect color
      })
      .on('mouseleave', function () {
        buttonCircle.attr('fill', 'transparent')
      })

    // Add content - display all data from the node
    let yOffset = popupY + padding + 40 // Start below the title

    // Add background for the label area with rounded bottom left corner
    // Using a path instead of rect to have control over individual corners
    // Using the same cornerRadius as defined above
    popup
      .append('path')
      .attr(
        'd',
        `
        M ${popupX} ${popupY + titleBarHeight}
        H ${popupX + labelWidth}
        V ${popupY + popupHeight}
        H ${popupX + cornerRadius}
        Q ${popupX} ${popupY + popupHeight} ${popupX} ${popupY + popupHeight - cornerRadius}
        V ${popupY + titleBarHeight}
        Z
      `
      )
      .attr('fill', md3Colors.labelBackground)

    // Helper function to force wrap text to fit available width without ellipsis
    const forceWrapText = (text: string, maxWidth: number): string => {
      // Create a temporary text element to measure text width
      const tempText = popup
        .append('text')
        .style('font-family', "'Roboto', 'Inter', sans-serif")
        .style('font-size', '14px')
        .text(text)
        .style('visibility', 'hidden') // Hide the element

      // Get the computed text length
      const textLength = tempText.node()?.getComputedTextLength() || 0

      // Remove the temporary element
      tempText.remove()

      // If text fits, return it as is
      if (textLength <= maxWidth) {
        return text
      }

      // If text doesn't fit, force wrap it by breaking at any point
      // Estimate the average character width
      const avgCharWidth = textLength / text.length

      // Calculate approximately how many characters can fit
      const charsToKeep = Math.floor(maxWidth / avgCharWidth)

      // Ensure we keep at least one character
      return charsToKeep > 0
        ? text.substring(0, charsToKeep)
        : text.substring(0, 1)
    }

    // Function to add a data row
    const addDataRow = (key: string, value: any) => {
      // Skip if value is undefined or null
      if (value === undefined || value === null) return

      // Format the value based on its type
      let displayValue = value
      if (typeof value === 'object') {
        displayValue = JSON.stringify(value)
      }

      // Add key with proper positioning in the label area
      // Ensure key text stays within the label area
      const labelMaxWidth = labelWidth - padding * 2
      const truncatedKey = forceWrapText(key, labelMaxWidth)

      popup
        .append('text')
        .attr('x', popupX + padding)
        .attr('y', yOffset)
        .text(truncatedKey)
        .style('font-family', "'Roboto', 'Inter', sans-serif")
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', md3Colors.onSurface)
        .style('text-anchor', 'start')
        .style('dominant-baseline', 'middle')

      // Add value (with improved word wrapping for long values)
      const valueText = displayValue.toString()
      // First split by whitespace
      const words = valueText.split(/\s+/)
      let line = ''
      let lineHeight = 18
      // Available width for the value text (accounting for label width and padding)
      const availableWidth = popupWidth - labelWidth - padding * 2 - 10 // labelWidth for label area, 10px safety margin
      // Use a more conservative character width estimate to ensure text fits
      const avgCharWidth = 5 // More conservative character width in pixels
      const maxCharsPerLine = Math.floor(availableWidth / avgCharWidth)

      // Value text starting position (aligned with the right edge of the label area, with matching padding)
      const valueX = popupX + labelWidth + padding

      // Store the initial yOffset to ensure label and first line of value are aligned
      const initialYOffset = yOffset

      // Flag to track if we're on the first line of value text
      let isFirstLine = true

      words.forEach((word: string) => {
        // Handle long words by breaking them into chunks
        if (word.length > maxCharsPerLine) {
          // If we have content in the current line, add it first
          if (line.trim()) {
            const truncatedLine = forceWrapText(line, availableWidth)
            popup
              .append('text')
              .attr('x', valueX) // Use the new value position
              .attr('y', isFirstLine ? initialYOffset : yOffset) // Use initialYOffset for first line
              .text(truncatedLine)
              .style('font-family', "'Roboto', 'Inter', sans-serif")
              .style('font-size', '14px')
              .style('fill', md3Colors.onSurface)
              .style('dominant-baseline', 'middle')

            isFirstLine = false // No longer on first line
            yOffset += lineHeight
            line = ''
          }

          // Break the long word into chunks
          let remainingWord = word
          while (remainingWord.length > 0) {
            const chunk = remainingWord.substring(0, maxCharsPerLine)
            remainingWord = remainingWord.substring(maxCharsPerLine)

            // No ellipsis needed as we're using force wrapping
            const displayChunk = chunk

            // Ensure the chunk fits within available width
            const truncatedChunk = forceWrapText(displayChunk, availableWidth)

            popup
              .append('text')
              .attr('x', valueX) // Use the new value position
              .attr('y', isFirstLine ? initialYOffset : yOffset) // Use initialYOffset for first line
              .text(truncatedChunk)
              .style('font-family', "'Roboto', 'Inter', sans-serif")
              .style('font-size', '14px')
              .style('fill', md3Colors.onSurface)
              .style('dominant-baseline', 'middle')

            isFirstLine = false // No longer on first line
            yOffset += lineHeight
          }

          // Start a new line (empty since we've processed the word)
          line = ''
        } else {
          // Normal word processing
          const testLine = line + word + ' '
          if (testLine.length > maxCharsPerLine) {
            // Add the current line
            const truncatedLine = forceWrapText(line, availableWidth)
            popup
              .append('text')
              .attr('x', valueX) // Use the new value position
              .attr('y', isFirstLine ? initialYOffset : yOffset) // Use initialYOffset for first line
              .text(truncatedLine)
              .style('font-family', "'Roboto', 'Inter', sans-serif")
              .style('font-size', '14px')
              .style('fill', md3Colors.onSurface)
              .style('dominant-baseline', 'middle')

            // Start a new line
            isFirstLine = false // No longer on first line
            line = word + ' '
            yOffset += lineHeight
          } else {
            line = testLine
          }
        }
      })

      // Add the last line
      if (line) {
        const truncatedLine = forceWrapText(line, availableWidth)
        popup
          .append('text')
          .attr('x', valueX) // Use the new value position
          .attr('y', isFirstLine ? initialYOffset : yOffset) // Use initialYOffset for first line
          .text(truncatedLine)
          .style('font-family', "'Roboto', 'Inter', sans-serif")
          .style('font-size', '14px')
          .style('fill', md3Colors.onSurface)
          .style('dominant-baseline', 'middle')

        isFirstLine = false // No longer on first line
      }

      yOffset += lineHeight + 8 // Add space between rows
    }

    // Add basic node properties
    addDataRow('ID', node.id)
    addDataRow('Group', node.group)

    // Add all properties from the data object
    if (node.data) {
      Object.entries(node.data).forEach(([key, value]) => {
        addDataRow(key, value)
      })
    }

    // Adjust popup height based on content
    const contentHeight = yOffset - popupY + padding
    const finalPopupHeight = Math.max(contentHeight, popupHeight)

    // Update main popup background height
    popup.select('rect').attr('height', finalPopupHeight)

    // Update label area background height by recreating the path with new height
    popup.select('path[fill="' + md3Colors.labelBackground + '"]').attr(
      'd',
      `
        M ${popupX} ${popupY + titleBarHeight}
        H ${popupX + labelWidth}
        V ${popupY + finalPopupHeight}
        H ${popupX + cornerRadius}
        Q ${popupX} ${popupY + finalPopupHeight} ${popupX} ${popupY + finalPopupHeight - cornerRadius}
        V ${popupY + titleBarHeight}
        Z
      `
    )

    // Add click handler to SVG to close popup when clicking outside
    this.svgElement?.on('click.popup', (event) => {
      const target = event.target as Element
      if (
        !target.closest('.node-info-popup') &&
        !target.closest('.node-group')
      ) {
        if (this.activePopup) {
          this.activePopup.remove()
          this.activePopup = null
          // Remove this event listener
          this.svgElement?.on('click.popup', null)
          // Zoom back out when closing popup
          this.zoomToFit()
        }
      }
    })

    // Zoom to show both the node and the popup
    setTimeout(() => {
      this.zoomToNodeAndPopup(node, {
        x: popupX,
        y: popupY,
        width: popupWidth,
        height: finalPopupHeight
      })
    }, 100) // Small delay to ensure popup is fully rendered
  }

  /**
   * Zooms to show both a node and its popup
   * @param node The node to show
   * @param popup The popup dimensions and position
   */
  private zoomToNodeAndPopup(
    node: CustomNode,
    popup: { x: number; y: number; width: number; height: number }
  ) {
    if (!this.svgElement || !this.zoomBehavior) return

    const width = this.containerRef.nativeElement.offsetWidth
    const height = this.containerRef.nativeElement.offsetHeight

    // Calculate the bounding box that includes both the node and the popup
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity

    // Add node to bounding box
    if (node.x !== undefined && node.y !== undefined) {
      minX = Math.min(minX, node.x - this.nodeSize.width / 2)
      maxX = Math.max(maxX, node.x + this.nodeSize.width / 2)
      minY = Math.min(minY, node.y - this.nodeSize.height / 2)
      maxY = Math.max(maxY, node.y + this.nodeSize.height / 2)
    }

    // Add popup to bounding box
    minX = Math.min(minX, popup.x)
    maxX = Math.max(maxX, popup.x + popup.width)
    minY = Math.min(minY, popup.y)
    maxY = Math.max(maxY, popup.y + popup.height)

    if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
      // Add padding to the bounding box
      const padding = Math.max(this.nodeSize.width, this.nodeSize.height) * 0.5
      minX -= padding
      maxX += padding
      minY -= padding
      maxY += padding

      const boundingWidth = maxX - minX
      const boundingHeight = maxY - minY

      if (boundingWidth === 0 || boundingHeight === 0) return

      // Calculate the scale needed to fit the bounding box
      const scaleX = width / boundingWidth
      const scaleY = height / boundingHeight
      const scale = Math.min(scaleX, scaleY) * 0.9 // 90% of available space for some margin

      // Calculate the translation to center the bounding box
      const translateX = width / 2 - ((minX + maxX) / 2) * scale
      const translateY = height / 2 - ((minY + maxY) / 2) * scale

      // Create and apply the transform with a smooth transition
      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale)

      this.svgElement
        .transition()
        .duration(500) // 500ms transition
        .call(this.zoomBehavior.transform as any, transform)
    }
  }

  public zoomToFit() {
    if (!this.nodes.length || !this.svgElement || !this.zoomBehavior) return

    const width = this.containerRef.nativeElement.offsetWidth
    const height = this.containerRef.nativeElement.offsetHeight

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity

    // Calculate the basic bounding box of all nodes
    this.nodes.forEach((n) => {
      const customNode = n as CustomNode
      if (customNode.x !== undefined && customNode.y !== undefined) {
        minX = Math.min(minX, customNode.x - this.nodeSize.width / 2)
        maxX = Math.max(maxX, customNode.x + this.nodeSize.width / 2)
        minY = Math.min(minY, customNode.y - this.nodeSize.height / 2)
        maxY = Math.max(maxY, customNode.y + this.nodeSize.height / 2)
      }
    })

    if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
      // Add padding to the bounding box to ensure nodes near edges have enough space
      const padding = Math.max(this.nodeSize.width, this.nodeSize.height)
      minX -= padding
      maxX += padding
      minY -= padding
      maxY += padding

      const graphActualWidth = maxX - minX
      const graphActualHeight = maxY - minY

      if (graphActualWidth === 0 || graphActualHeight === 0) return

      const scaleX = width / graphActualWidth
      const scaleY = height / graphActualHeight
      const scale = Math.min(scaleX, scaleY) * 0.7 // Reduced from 0.85 to 0.7 for more whitespace

      const translateX = width / 2 - ((minX + maxX) / 2) * scale
      const translateY = height / 2 - ((minY + maxY) / 2) * scale

      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale)
      this.svgElement
        .transition()
        .duration(500) // Add smooth transition
        .call(this.zoomBehavior.transform as any, transform)
    } else {
      // Fallback if bounds are not valid, center on simulation center
      const fallbackScale = Math.min(width / 1000, height / 800) * 0.4 // Reduced from 0.5 to 0.4 for more whitespace
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(fallbackScale)
        .translate(-width / 2, -height / 2)
      this.svgElement
        .transition()
        .duration(500) // Add smooth transition
        .call(this.zoomBehavior.transform as any, transform)
    }
  }

  ngOnDestroy() {
    // Clean up D3 simulation and SVG to prevent memory leaks if component is destroyed
    d3.select(this.containerRef.nativeElement).select('svg').remove()
    const simulation = d3.forceSimulation()
    if (simulation) {
      simulation.stop()
    }

    // Remove event listeners to prevent memory leaks
    window.removeEventListener('online', this.onlineListener)
    window.removeEventListener('offline', this.offlineListener)
    window.removeEventListener('resize', this.resizeListener)

    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    // Note: Effects are automatically cleaned up when the component is destroyed
  }
}
