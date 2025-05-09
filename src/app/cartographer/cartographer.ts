import * as d3 from 'd3'
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild
} from '@angular/core'
import { collection, collectionData, Firestore } from '@angular/fire/firestore'
import { combineLatest, Observable, Subscription } from 'rxjs'

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
  template: ` <div #container class="graph-container"></div>`,
  styleUrls: ['./cartographer.component.sass']
})
export class Cartographer implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true })
  containerRef!: ElementRef<HTMLDivElement>
  private graphSub?: Subscription

  private graphNodes: GraphNode[] = []
  private graphEdges: GraphEdge[] = []

  constructor(
    private firestore: Firestore,
    private zone: NgZone
  ) {}

  ngAfterViewInit() {
    const nodesCol = collection(this.firestore, 'nodes')
    const edgesCol = collection(this.firestore, 'edges')

    this.graphSub = combineLatest([
      collectionData(nodesCol, { idField: 'id' }) as Observable<GraphNode[]>,
      collectionData(edgesCol, { idField: 'id' }) as Observable<GraphEdge[]>
    ]).subscribe(([nodes, edges]) => {
      this.graphNodes = nodes
      this.graphEdges = edges
      this.zone.runOutsideAngular(() => {
        if (
          this.containerRef.nativeElement.offsetWidth > 0 &&
          this.containerRef.nativeElement.offsetHeight > 0
        ) {
          this.createGraph()
        } else {
          // Fallback or retry logic if dimensions are not yet available
          setTimeout(() => this.createGraph(), 50)
        }
      })
    })
  }

  private toD3Data(): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = this.graphNodes.map((n) => ({ ...n }))
    const edges: Edge[] = this.graphEdges.map(
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

    if (!this.graphNodes.length) return

    const { nodes, edges } = this.toD3Data()
    const width = this.containerRef.nativeElement.offsetWidth
    const height = this.containerRef.nativeElement.offsetHeight

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
      if (!nodes.length) return

      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity
      nodes.forEach((n) => {
        if (n.x !== undefined && n.y !== undefined) {
          minX = Math.min(minX, n.x - nodeSize.width / 2)
          maxX = Math.max(maxX, n.x + nodeSize.width / 2)
          minY = Math.min(minY, n.y - nodeSize.height / 2)
          maxY = Math.max(maxY, n.y + nodeSize.height / 2)
        }
      })

      if (
        isFinite(minX) &&
        isFinite(maxX) &&
        isFinite(minY) &&
        isFinite(maxY)
      ) {
        const graphActualWidth = maxX - minX
        const graphActualHeight = maxY - minY

        if (graphActualWidth === 0 || graphActualHeight === 0) return

        const scaleX = width / graphActualWidth
        const scaleY = height / graphActualHeight
        const scale = Math.min(scaleX, scaleY) * 0.85 // 0.85 for some padding

        const translateX = width / 2 - ((minX + maxX) / 2) * scale
        const translateY = height / 2 - ((minY + maxY) / 2) * scale

        const initialTransform = d3.zoomIdentity
          .translate(translateX, translateY)
          .scale(scale)
        svg.call(zoomBehavior.transform as any, initialTransform)
      } else {
        // Fallback if bounds are not valid, center on simulation center
        const fallbackScale = Math.min(width / 1000, height / 800) * 0.5 // Adjust default scale
        const initialTransform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(fallbackScale)
          .translate(-width / 2, -height / 2)
        svg.call(zoomBehavior.transform as any, initialTransform)
      }
    }, 300) // Increased timeout for simulation to stabilize more
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
    if (this.graphSub) this.graphSub.unsubscribe()
    // Clean up D3 simulation and SVG to prevent memory leaks if component is destroyed
    d3.select(this.containerRef.nativeElement).select('svg').remove()
    const simulation = d3.forceSimulation()
    if (simulation) {
      simulation.stop()
    }
  }
}
