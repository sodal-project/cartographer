import * as d3 from 'd3'
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  WritableSignal,
  effect,
  computed,
  runInInjectionContext,
  Injector
} from '@angular/core'
import { collection, collectionData, Firestore } from '@angular/fire/firestore'
import { Observable, Subscription } from 'rxjs'
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
      <button class="zoom-fit-button" (click)="zoomToFit()" title="Zoom to fit all nodes">
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
  private svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private nodes: Node[] = [];
  private nodeSize: { width: number; height: number } = { width: 160, height: 48 };

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
      this.zoomToFit();
    }
  }

  // Track if the component is visible
  private isVisible: WritableSignal<boolean> = signal(false);
  // Observer for visibility changes
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Set up event listeners for online/offline status
    window.addEventListener('online', this.onlineListener)
    window.addEventListener('offline', this.offlineListener)
    // Set up event listener for window resize
    window.addEventListener('resize', this.resizeListener)

    // Set up an effect to create the graph when data changes
    effect(() => {
      const data = this.d3Data();
      if (data.nodes.length > 0 && this.containerRef?.nativeElement) {
        this.zone.runOutsideAngular(() => {
          // Initialize the graph if the component is visible or force initialization
          if (this.isVisible()) {
            this.createGraph();
          }
        })
      }
    });
  }

  ngAfterViewInit() {
    const nodesCol = collection(this.firestore, 'nodes')
    const edgesCol = collection(this.firestore, 'edges')

    // Convert Firestore observables to signals
    const nodesObservable = collectionData(nodesCol, { idField: 'id' }) as Observable<GraphNode[]>
    const edgesObservable = collectionData(edgesCol, { idField: 'id' }) as Observable<GraphEdge[]>

    // Use runInInjectionContext to provide injection context for toSignal
    runInInjectionContext(this.injector, () => {
      // Use toSignal to convert the observables to signals
      const nodesSignal = toSignal(nodesObservable, { initialValue: [] as GraphNode[] })
      const edgesSignal = toSignal(edgesObservable, { initialValue: [] as GraphEdge[] })

      // Set up an effect to update our signals when the Firestore data changes
      effect(() => {
        this.graphNodes.set(nodesSignal())
        this.graphEdges.set(edgesSignal())

        // If the graph is already created, zoom to fit when data changes
        if (this.svgElement && this.zoomBehavior && this.isVisible()) {
          // Use setTimeout to allow the graph to update first
          setTimeout(() => this.zoomToFit(), 500);
        }
      });
    });

    // Set up ResizeObserver to detect when the component becomes visible
    this.setupVisibilityDetection();
  }

  private setupVisibilityDetection(): void {
    // Create a ResizeObserver to detect when the container gets dimensions
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // Component is now visible with dimensions
          this.isVisible.set(true);

          // If we have data, create the graph
          if (this.d3Data().nodes.length > 0) {
            this.zone.runOutsideAngular(() => {
              this.createGraph();
            });
          }
        }
      }
    });

    // Start observing the container
    if (this.containerRef?.nativeElement) {
      this.resizeObserver.observe(this.containerRef.nativeElement);
    }
  }

  private toD3Data(): { nodes: Node[]; edges: Edge[] } {
    // Get the current values from the signals
    const graphNodes = this.graphNodes()
    const graphEdges = this.graphEdges()

    const nodes: Node[] = graphNodes.map((n) => ({ ...n }))
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
    this.nodeSize = { width: 160, height: 48 }

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
    this.svgElement = svg as d3.Selection<SVGSVGElement, unknown, null, undefined>;

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
    this.zoomBehavior = zoomBehavior;

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

    const nodeSize = { width: 160, height: 48 }
    const nodeRadius = 8 // For rounded corners

    const node = graphContainer
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'grab')
      .call(this.setupDrag(d3) as any)

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

    node
      .append('text')
      .text((d) => d.id) // Or d.label / d.name if you have one
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.35em') // Vertical alignment
      .attr('text-anchor', 'middle')
      .style('font-family', "'Roboto', 'Inter', sans-serif")
      .style('font-size', '14px')
      .style('fill', md3Colors.onPrimary) // Assuming node fills are dark enough
      .style('pointer-events', 'none')

    node
      .on('mouseover', (event) => {
        const element = d3.select(event.currentTarget)
        element.select('rect').attr('fill-opacity', 0.85)
        element
          .transition()
          .duration(150)
          .attr('transform', function (d) {
            const node = d as Node
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
            const node = d as Node
            if (
              typeof node.x === 'undefined' ||
              typeof node.y === 'undefined'
            ) {
              return 'translate(0, 0) scale(1)'
            }
            return `translate(${node.x}, ${node.y}) scale(1)`
          })
      })

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        'link',
        d3
          .forceLink<Node, Edge>(edges)
          .id((d) => d.id)
          .distance(150)
          .strength(0.2)
      )
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(nodeSize.width / 2 + 20))

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as Node).x!)
        .attr('y1', (d) => (d.source as Node).y!)
        .attr('x2', (d) => (d.target as Node).x!)
        .attr('y2', (d) => (d.target as Node).y!)
      node.attr('transform', (d) => `translate(${d.x!},${d.y!})`)
    })

    // Center graph on startup
    // Wait for a few ticks of the simulation for a more stable layout before centering.
    setTimeout(() => {
      this.zoomToFit();
    }, 300) // Increased timeout for simulation to stabilize more
  }

  /**
   * Zooms the view to fit all nodes on screen
   * This ensures all graph elements remain visible
   */
  public zoomToFit() {
    if (!this.nodes.length || !this.svgElement || !this.zoomBehavior) return;

    const width = this.containerRef.nativeElement.offsetWidth;
    const height = this.containerRef.nativeElement.offsetHeight;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    // Calculate the basic bounding box of all nodes
    this.nodes.forEach((n) => {
      if (n.x !== undefined && n.y !== undefined) {
        minX = Math.min(minX, n.x - this.nodeSize.width / 2);
        maxX = Math.max(maxX, n.x + this.nodeSize.width / 2);
        minY = Math.min(minY, n.y - this.nodeSize.height / 2);
        maxY = Math.max(maxY, n.y + this.nodeSize.height / 2);
      }
    });

    if (
      isFinite(minX) &&
      isFinite(maxX) &&
      isFinite(minY) &&
      isFinite(maxY)
    ) {
      // Add padding to the bounding box to ensure nodes near edges have enough space
      const padding = Math.max(this.nodeSize.width, this.nodeSize.height);
      minX -= padding;
      maxX += padding;
      minY -= padding;
      maxY += padding;

      const graphActualWidth = maxX - minX;
      const graphActualHeight = maxY - minY;

      if (graphActualWidth === 0 || graphActualHeight === 0) return;

      const scaleX = width / graphActualWidth;
      const scaleY = height / graphActualHeight;
      const scale = Math.min(scaleX, scaleY) * 0.7; // Reduced from 0.85 to 0.7 for more whitespace

      const translateX = width / 2 - ((minX + maxX) / 2) * scale;
      const translateY = height / 2 - ((minY + maxY) / 2) * scale;

      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);
      this.svgElement.call(this.zoomBehavior.transform as any, transform);
    } else {
      // Fallback if bounds are not valid, center on simulation center
      const fallbackScale = Math.min(width / 1000, height / 800) * 0.4; // Reduced from 0.5 to 0.4 for more whitespace
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(fallbackScale)
        .translate(-width / 2, -height / 2);
      this.svgElement.call(this.zoomBehavior.transform as any, transform);
    }
  }

  setupDrag(d3Instance: typeof d3) {
    function dragstarted(
      event: d3.D3DragEvent<SVGGElement, Node, Node>,
      d: Node
    ) {
      if (!event.active)
        (d3Instance.forceSimulation() as any).alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
      d3.select(event.sourceEvent.target.closest('.node-group')).style(
        'cursor',
        'grabbing'
      )
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(
      event: d3.D3DragEvent<SVGGElement, Node, Node>,
      d: Node
    ) {
      if (!event.active) (d3Instance.forceSimulation() as any).alphaTarget(0)
      d.fx = null
      d.fy = null
      d3.select(event.sourceEvent.target.closest('.node-group')).style(
        'cursor',
        'grab'
      )
    }

    return d3Instance
      .drag<SVGGElement, Node>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
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
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Note: Effects are automatically cleaned up when the component is destroyed
  }
}
