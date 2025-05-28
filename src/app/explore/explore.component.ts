import * as d3 from 'd3'
import { SimulationLinkDatum } from 'd3'
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
import { collection, collectionData, Firestore } from '@angular/fire/firestore'
import { Observable } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatIcon, MatIconModule } from '@angular/material/icon'
import { BrainyData } from '@soulcraft/brainy'
import { ProfileService } from '../services/profile.service'

// Define interfaces for graph data (adjust as per your actual data structure)
interface GraphNode {
  id: string
  group?: number // Optional group for coloring
  // Add other properties if they exist, like 'label' or 'name'
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null

  // Allow accessing arbitrary string properties
  [key: string]: any
}

interface GraphEdge {
  id: string
  source: string | GraphNode // Can be ID or GraphNode object
  target: string | GraphNode // Can be ID or GraphNode object
  // Add other properties if they exist
}

// D3 specific node and link types
interface Node extends d3.SimulationNodeDatum, GraphNode {}

interface Edge extends d3.SimulationLinkDatum<Node> {
  source: string | Node // D3 expects source/target to be Node objects or IDs after processing
  target: string | Node
}

interface CustomNode extends Node {
  data: {
    displayName: string
    handle: string
    avatar: string
    [key: string]: any
  }
}

@Component({
  selector: 'd3-explore',
  standalone: true,
  imports: [MatIcon],
  template: `
    @if (isOffline()) {
      <div class="offline-indicator">
        <mat-icon>cloud_off</mat-icon>
        <span>You are offline. The graph is displaying cached data.</span>
      </div>
    }
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
  styleUrls: ['./explore.component.sass']
})
export class ExploreComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true })
  containerRef!: ElementRef<HTMLDivElement>
  // We no longer need the subscription since we're using signals

  // Convert to signals
  private graphNodes: WritableSignal<GraphNode[]> = signal([])
  private graphEdges: WritableSignal<GraphEdge[]> = signal([])
  private searchResults: WritableSignal<any[]> = signal([])
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
  private profileService = inject(ProfileService)
  private brainyService = new BrainyData()

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

    // Wait for ProfileService to initialize before fetching initial search results
    this.profileService
      .waitForInitialization()
      .then(() => {
        console.log(
          'ProfileService initialized, fetching initial search results'
        )
        return this.fetchSearchResults()
      })
      .catch((error) => {
        console.error(
          'Error initializing ProfileService or fetching initial search results:',
          error
        )
      })
  }

  /**
   * Fetches the latest search results from the Brainy database
   * @param limit The maximum number of results to return (default: 100)
   */
  private async fetchSearchResults(limit: number = 100): Promise<void> {
    try {
      console.log('Fetching search results from Brainy database')

      // Initialize the database if needed
      await this.brainyService.init()

      // Use an empty string query to get all results
      // Increased limit to show all profiles initially
      const searchResults = await this.brainyService.search("", limit)

      // Transform the search results to match the expected format
      const transformedResults = searchResults.map((result) => ({
        profile: {
          id: result.id,
          ...result.metadata,
          data: result.metadata
        },
        similarity: result.score
      }))

      console.log(
        `Search results from Brainy: ${transformedResults.length} profiles found`
      )

      if (transformedResults.length > 0) {
        this.searchResults.set(transformedResults)
      } else {
        console.warn('No profiles found in BrainyData. The graph may be empty.')
      }
    } catch (error) {
      console.error('Error fetching search results from Brainy:', error)
    }
  }

  ngAfterViewInit() {
    const nodesCol = collection(this.firestore, 'Profiles')
    const edgesCol = collection(this.firestore, 'edges')

    // Convert Firestore observables to signals
    const nodesObservable = collectionData(nodesCol, {
      idField: 'id'
    }) as Observable<GraphNode[]>
    const edgesObservable = collectionData(edgesCol, {
      idField: 'id'
    }) as Observable<GraphEdge[]>

    // Use runInInjectionContext to provide injection context for toSignal
    runInInjectionContext(this.injector, () => {
      // Use toSignal to convert the observables to signals
      const nodesSignal = toSignal(nodesObservable, {
        initialValue: [] as GraphNode[]
      })
      const edgesSignal = toSignal(edgesObservable, {
        initialValue: [] as GraphEdge[]
      })

      // Set up an effect to update our signals when the Firestore data changes
      effect(() => {
        this.graphNodes.set(nodesSignal())
        this.graphEdges.set(edgesSignal())

        // If the graph is already created, zoom to fit when data changes
        if (this.svgElement && this.zoomBehavior && this.isVisible()) {
          // Use setTimeout to allow the graph to update first
          setTimeout(() => this.zoomToFit(), 500)
        }
      })
    })

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

          // Wait for ProfileService to initialize before fetching search results
          this.profileService
            .waitForInitialization()
            .then(() => {
              console.log('ProfileService initialized, fetching search results')

              // Refresh search results when component becomes visible
              return this.fetchSearchResults()
            })
            .then(() => {
              // If we have data, create the graph
              if (this.d3Data().nodes.length > 0) {
                this.zone.runOutsideAngular(() => {
                  this.createGraph()
                })
              } else {
                console.log('No nodes available when component became visible')
              }
            })
            .catch((error) => {
              console.error(
                'Error initializing or fetching search results:',
                error
              )
            })
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
    const searchResultsData = this.searchResults()

    // Transform GraphNode objects to match the CustomNode interface expected by D3
    const nodes: CustomNode[] = graphNodes.map((n) => {
      // Create a copy of the node with the data property structured as expected by D3
      return n as CustomNode
    })

    // Add search results from Brainy to the nodes array if available
    if (searchResultsData.length > 0) {
      console.log('Adding search results to D3 data:', searchResultsData)

      // Convert search results to CustomNode format
      const searchResultNodes: CustomNode[] = searchResultsData.map(
        (result) => {
          // Extract the profile from the search result
          const profile = result.profile

          // Create a CustomNode from the profile, ensuring it has the required properties
          const node: CustomNode = {
            id: profile.id,
            group: 1, // Use a different group to highlight search results
            ...profile, // Spread other properties from profile
            data: {
              displayName:
                profile.data?.displayName || profile.displayName || 'Unknown',
              handle: profile.data?.handle || profile.handle || '',
              avatar: profile.data?.avatar || profile.avatar || '',
              ...profile.data // Spread other data properties
            }
          }

          // Add similarity score to the node data if available
          if (result['similarity'] !== undefined) {
            node.data['similarity'] = result['similarity']
          }

          return node
        }
      )

      // Add search result nodes to the nodes array
      // Use a Set to deduplicate nodes by ID
      const nodeIds = new Set(nodes.map((n) => n.id))
      for (const node of searchResultNodes) {
        if (!nodeIds.has(node.id)) {
          nodes.push(node)
          nodeIds.add(node.id)
        } else {
          // If the node already exists, update its group to highlight it
          const existingNode = nodes.find((n) => n.id === node.id)
          if (existingNode) {
            existingNode.group = 1

            // Ensure existingNode.data is initialized
            if (!existingNode.data) {
              existingNode.data = {
                displayName: node.data?.displayName || 'Unknown',
                handle: node.data?.handle || '',
                avatar: node.data?.avatar || ''
              }
            }

            // Copy similarity score if available
            if (node.data?.['similarity'] !== undefined) {
              existingNode.data['similarity'] = node.data?.['similarity']
            }

            // Update other data properties if needed
            if (node.data) {
              existingNode.data = {
                ...existingNode.data,
                ...node.data
              }
            }
          }
        }
      }
    }

    const edges: Edge[] = graphEdges.map(
      (e) =>
        ({
          source:
            typeof e.source === 'string'
              ? e.source
              : (e.source as GraphNode).id,
          target:
            typeof e.target === 'string' ? e.target : (e.target as GraphNode).id
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
        .attr('x1', (d) => (d.source as unknown as CustomNode).x!)
        .attr('y1', (d) => (d.source as unknown as CustomNode).y!)
        .attr('x2', (d) => (d.target as unknown as CustomNode).x!)
        .attr('y2', (d) => (d.target as unknown as CustomNode).y!)
      node.attr('transform', (d) => {
        const customNode = d as CustomNode
        return `translate(${customNode.x!},${customNode.y!})`
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
