import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
  OnDestroy
} from '@angular/core'
import * as d3 from 'd3'
import { Firestore, collectionData, collection } from '@angular/fire/firestore'
import { Subscription, combineLatest, Observable } from 'rxjs'
import { GraphEdge, GraphNode } from '../models/graph.model'

interface Node extends d3.SimulationNodeDatum {
  id: string
  group?: number
}

interface Edge extends d3.SimulationLinkDatum<Node> {
  source: string | Node
  target: string | Node
}

@Component({
  selector: 'd3-cartographer',
  standalone: true,
  template: ` <div #container class="graph-container"></div>`,
  styleUrls: ['./cartographer.component.sass']
})
export class Cartographer implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef
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
    ]).subscribe((value: [GraphNode[], GraphEdge[]]) => {
      const [nodes, edges] = value
      this.graphNodes = nodes
      this.graphEdges = edges
      this.zone.runOutsideAngular(() => this.createGraph())
    })
  }

  /**
   * Converts GraphNode[]/GraphEdge[] to D3-friendly structures.
   */
  private toD3Data(): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = this.graphNodes.map((n) => ({
      id: n.id,
      group: (n as any).group ?? 0 // or map your group property if relevant; adjust as needed
    }))
    const edges: Edge[] = this.graphEdges.map((e) => ({
      source: e.source,
      target: e.target
    }))
    return { nodes, edges }
  }

  createGraph() {
    // Clear existing SVG for reloads/redraws
    d3.select(this.containerRef.nativeElement).selectAll('svg').remove()

    const { nodes, edges } = this.toD3Data()
    const width = this.containerRef.nativeElement.offsetWidth
    const height = this.containerRef.nativeElement.offsetHeight
    const svg = d3
      .select(this.containerRef.nativeElement)
      .append('svg')
      .attr('width', width)
      .attr('height', height)

    // zoom/pan setup
    const container = svg.append('g')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
        container.attr('transform', event.transform)
      })
    )

    const edge = container
      .append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.7)
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('class', 'edge')
      .attr('stroke-width', 2)

    const node = container
      .append('g')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(this.setupDrag(d3))

    // Replace circle with rectangle
    node
      .append('rect')
      .attr('width', 128) // Width of rectangle
      .attr('height', 32) // Height of rectangle
      .attr('x', -64) // Center the rectangle
      .attr('y', -16) // Center the rectangle
      .attr('fill', 'white')
      .on('mouseover', function () {
        d3.select(this).attr('stroke', 'black').attr('stroke-width', 3)
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5)
      })

    node
      .append('text')
      .text((d) => d.id)
      .attr('y', 5)
      .attr('text-anchor', 'middle')

    // Simulation
    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        'edge',
        d3
          .forceLink<Node, Edge>(edges)
          .id((d) => d.id)
          .distance(90)
      )
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(width / 2, height / 2))

    simulation.on('tick', () => {
      edge
        .attr('x1', (d: any) => (d.source as Node).x!)
        .attr('y1', (d: any) => (d.source as Node).y!)
        .attr('x2', (d: any) => (d.target as Node).x!)
        .attr('y2', (d: any) => (d.target as Node).y!)
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })
  }

  setupDrag(d3Instance: typeof d3) {
    // ...same as before
    const dragBehavior = d3Instance
      .drag<SVGGElement, Node>()
      .on('start', function (event, d) {
        if (!event.active) (event.subject as any).fx = d.x
        if (!event.active) (event.subject as any).fy = d.y
      })
      .on('drag', function (event, d) {
        ;(d as any).fx = event.x
        ;(d as any).fy = event.y
      })
      .on('end', function (_event, d) {
        ;(d as any).fx = null
        ;(d as any).fy = null
      })
    return function (selection: d3.Selection<SVGGElement, Node, any, any>) {
      selection.call(dragBehavior as any)
    }
  }

  ngOnDestroy() {
    if (this.graphSub) this.graphSub.unsubscribe()
  }
}
