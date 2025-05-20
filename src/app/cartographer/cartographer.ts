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
import { MatIcon } from '@angular/material/icon'

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
  selector: 'd3-cartographer',
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
  styleUrls: ['./cartographer.component.sass']
})
export class Cartographer implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true })
  containerRef!: ElementRef<HTMLDivElement>
  // We no longer need the subscription since we're using signals

  // Convert to signals
  private graphNodes: WritableSignal<GraphNode[]> = signal([])
  private graphEdges: WritableSignal<GraphEdge[]> = signal([])
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

    // Add card background
    node
      .append('rect')
      .attr('width', nodeSize.width)
      .attr('height', nodeSize.height)
      .attr('x', -nodeSize.width / 2)
      .attr('y', -nodeSize.height / 2)
      .attr('rx', nodeRadius)
      .attr('ry', nodeRadius)
      .attr(
        'fill',
        (d) => nodeColorPalette[(d.group || 0) % nodeColorPalette.length]
      )
      .attr('stroke', md3Colors.outline)
      .attr('stroke-width', 0.5)
      .style('filter', 'url(#md-shadow)')

    // Add avatar image
    node
      .append('image')
      .attr('x', -nodeSize.width / 2 + 10) // Position on the left side of the card with some margin
      .attr('y', -avatarRadius)
      .attr('width', avatarRadius * 2)
      .attr('height', avatarRadius * 2)
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

    // Calculate available width for text (card width minus avatar width and margins)
    const textAvailableWidth = nodeSize.width - (avatarRadius * 2 + 25) - 10 // 25px for left margin, 10px for right margin

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
      .attr('x', -nodeSize.width / 2 + avatarRadius * 2 + 15) // Position to the right of the avatar with some margin
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', md3Colors.onPrimary)
      .style('pointer-events', 'none')

    // Add email text (handle) - ensuring it's fully visible without truncation
    node
      .append('text')
      .text((d) => {
        return (d as CustomNode).data?.handle || '' // Display full handle without truncation
      })
      .attr('x', -nodeSize.width / 2 + avatarRadius * 2 + 15) // Position to the right of the avatar with some margin
      .attr('y', 10)
      .attr('text-anchor', 'start')
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '12px')
      .style('fill', md3Colors.onPrimary)
      .style('pointer-events', 'none')

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
      shadow: 'rgba(0, 0, 0, 0.3)'
    }

    // Create a group for the popup
    const popup = container.append('g').attr('class', 'node-info-popup')
    this.activePopup = popup as d3.Selection<
      SVGGElement,
      unknown,
      null,
      undefined
    >

    // Get mouse position relative to the container
    const [mouseX, mouseY] = d3.pointer(event, container.node())

    // Popup dimensions
    const popupWidth = 300
    const popupHeight = 400
    const padding = 16

    // Create popup background
    popup
      .append('rect')
      .attr('width', popupWidth)
      .attr('height', popupHeight)
      .attr('x', mouseX)
      .attr('y', mouseY)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', md3Colors.surface)
      .attr('stroke', md3Colors.outline)
      .attr('stroke-width', 1)
      .style('filter', 'url(#md-shadow)')

    // Add title
    popup
      .append('text')
      .attr('x', mouseX + padding)
      .attr('y', mouseY + padding + 16)
      .text('Node Information')
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', md3Colors.primary)

    // Add close button
    const closeButton = popup
      .append('g')
      .attr('class', 'close-button')
      .style('cursor', 'pointer')
      .on('click', () => {
        if (this.activePopup) {
          this.activePopup.remove()
          this.activePopup = null
        }
      })

    closeButton
      .append('circle')
      .attr('cx', mouseX + popupWidth - padding)
      .attr('cy', mouseY + padding)
      .attr('r', 12)
      .attr('fill', md3Colors.outline)
      .attr('fill-opacity', 0.2)

    closeButton
      .append('text')
      .attr('x', mouseX + popupWidth - padding)
      .attr('y', mouseY + padding + 5)
      .text('×')
      .attr('text-anchor', 'middle')
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '20px')
      .style('fill', md3Colors.onSurface)
      .style('pointer-events', 'none')

    // Add content - display all data from the node
    let yOffset = mouseY + padding + 40 // Start below the title

    // Function to add a data row
    const addDataRow = (key: string, value: any) => {
      // Skip if value is undefined or null
      if (value === undefined || value === null) return

      // Format the value based on its type
      let displayValue = value
      if (typeof value === 'object') {
        displayValue = JSON.stringify(value)
      }

      // Add key
      popup
        .append('text')
        .attr('x', mouseX + padding)
        .attr('y', yOffset)
        .text(key + ':')
        .style('font-family', "'Roboto', 'Inter', sans-serif")
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', md3Colors.onSurface)

      // Add value (with word wrapping for long values)
      const valueText = displayValue.toString()
      const words = valueText.split(/\s+/)
      let line = ''
      let lineHeight = 18

      words.forEach((word: string) => {
        const testLine = line + word + ' '
        if (testLine.length * 7 > popupWidth - padding * 2) {
          // Approximate character width
          // Add the current line
          popup
            .append('text')
            .attr('x', mouseX + padding + 80) // Indent from the key
            .attr('y', yOffset)
            .text(line)
            .style('font-family', "'Roboto', 'Inter', sans-serif")
            .style('font-size', '14px')
            .style('fill', md3Colors.onSurface)

          // Start a new line
          line = word + ' '
          yOffset += lineHeight
        } else {
          line = testLine
        }
      })

      // Add the last line
      if (line) {
        popup
          .append('text')
          .attr('x', mouseX + padding + 80) // Indent from the key
          .attr('y', yOffset)
          .text(line)
          .style('font-family', "'Roboto', 'Inter', sans-serif")
          .style('font-size', '14px')
          .style('fill', md3Colors.onSurface)
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
    const contentHeight = yOffset - mouseY + padding
    popup.select('rect').attr('height', Math.max(contentHeight, popupHeight))

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
        }
      }
    })
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
      this.svgElement.call(this.zoomBehavior.transform as any, transform)
    } else {
      // Fallback if bounds are not valid, center on simulation center
      const fallbackScale = Math.min(width / 1000, height / 800) * 0.4 // Reduced from 0.5 to 0.4 for more whitespace
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(fallbackScale)
        .translate(-width / 2, -height / 2)
      this.svgElement.call(this.zoomBehavior.transform as any, transform)
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
