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
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { BrainyData } from '@soulcraft/brainy'
import { ProfileService } from '../services/profile.service'
import { EdgeVerbs } from '../models/cartographer.model'
import { NodeDataService } from '../services/node-data.service'

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
interface Node extends d3.SimulationNodeDatum, GraphNode {
}

interface Edge extends d3.SimulationLinkDatum<Node> {
  source: string | Node // D3 expects source/target to be Node objects or IDs after processing
  target: string | Node
  verb?: keyof typeof EdgeVerbs // Verb name from EdgeVerbs
  confidence?: number // Confidence score between 0 and 1
}

interface CustomNode extends Node {
  // Essential data for rendering
  data: {
    displayName: string
    handle: string
    avatar: string
    [key: string]: any
  }
  // Full node ID for fetching complete data when needed
  fullDataId?: string
}

@Component({
  selector: 'd3-explore',
  standalone: true,
  imports: [MatIcon, MatIconModule, MatButtonModule, MatTooltipModule],
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
  private nodeToSelectId: string | null = null
  private nodeSize: { width: number; height: number } = {
    width: 160,
    height: 48
  }

  // Web Worker for force simulation
  private simulationWorker: Worker | null = null

  // Reference to the active popup
  private overlayContainer: d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null = null
  private activePopup: d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null = null

  // Track the currently selected node (if any)
  private selectedNodeId: string | null = null

  // Computed signal for D3 data
  private d3Data = computed(() => this.toD3Data())

  // Use inject for dependency injection
  private firestore = inject(Firestore)
  private zone = inject(NgZone)
  private injector = inject(Injector)
  private profileService = inject(ProfileService)
  private nodeDataService = inject(NodeDataService)
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
      let searchResults;
      try {
        searchResults = await this.brainyService.search('', limit)
      } catch (searchError) {
        // Check if this is the "Neighbor not found" error
        if (searchError instanceof Error &&
            searchError.message &&
            searchError.message.includes('Neighbor with ID') &&
            searchError.message.includes('not found in pruneConnections')) {
          console.warn(`HNSW index error: ${searchError.message}`)
          console.log('Attempting to reinitialize BrainyData to recover from HNSW index error')

          // Try to reinitialize
          await this.brainyService.init()

          // Try search again after reinitialization
          try {
            searchResults = await this.brainyService.search('', limit)
          } catch (retryError) {
            console.error('Failed to recover from HNSW index error:', retryError)
            return
          }
        } else {
          // For other search errors, log and return
          console.error('Error searching in Brainy database:', searchError)
          return
        }
      }

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
    console.log('Setting up visibility detection')
    // Create a ResizeObserver to detect when the container gets dimensions
    this.resizeObserver = new ResizeObserver((entries) => {
      console.log('ResizeObserver callback triggered')
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        console.log(`ResizeObserver: container dimensions: width=${width}, height=${height}`)
        if (width > 0 && height > 0) {
          console.log('ResizeObserver: component is now visible with dimensions')
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
    // Only include essential data for rendering, store full ID for fetching complete data later
    const nodes: CustomNode[] = graphNodes.map((n) => {
      // Create a copy of the node with only essential data
      const customNode: CustomNode = {
        id: n.id,
        group: n.group,
        noun: n['noun'],
        fullDataId: n.id, // Store the ID for fetching complete data later
        data: {
          displayName: n['data']?.displayName || 'Unknown',
          handle: n['data']?.handle || '',
          avatar: n['data']?.avatar || '',
          // Include only essential additional properties
          noun: n['noun']
        }
      }
      return customNode
    })

    // Add search results from Brainy to the nodes array if available
    if (searchResultsData.length > 0) {
      console.log('Adding search results to D3 data:', searchResultsData)

      // Convert search results to CustomNode format with only essential data
      const searchResultNodes: CustomNode[] = searchResultsData.map(
        (result) => {
          // Extract the profile from the search result
          const profile = result.profile

          // Create a CustomNode from the profile with only essential data
          const node: CustomNode = {
            id: profile.id,
            group: 1, // Use a different group to highlight search results
            noun: profile['noun'],
            fullDataId: profile.id, // Store the ID for fetching complete data later
            data: {
              displayName:
                profile.data?.['displayName'] ||
                profile.displayName ||
                'Unknown',
              handle: profile.data?.['handle'] || profile.handle || '',
              avatar: profile.data?.avatar || profile.avatar || '',
              // Include only essential additional properties
              noun: profile['noun']
            }
          }

          // Add similarity score as it's useful for visualization
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
            existingNode.fullDataId = node.id // Ensure fullDataId is set

            // Ensure existingNode.data is initialized with essential data
            if (!existingNode.data) {
              existingNode.data = {
                displayName: node.data?.['displayName'] || 'Unknown',
                handle: node.data?.['handle'] || '',
                avatar: node.data?.['avatar'] || ''
              }
            }

            // Copy similarity score if available
            if (node.data?.['similarity'] !== undefined) {
              existingNode.data['similarity'] = node.data?.['similarity']
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

    // Add random edges for testing layout
    this.addRandomEdges(nodes, edges)

    // Add random groups and lists
    this.addRandomGroups(nodes, edges)

    return { nodes, edges }
  }

  /**
   * Adds random groups and lists with memberOf relationships
   * @param nodes The array of nodes to add random groups to
   * @param edges The array of edges to add random group edges to
   */
  private addRandomGroups(nodes: CustomNode[], edges: Edge[]): void {
    // Find person nodes to use for creating random groups and lists
    const personNodes = nodes.filter((node) => node['noun'] === 'person')

    // Create at least one person node if none exist
    if (personNodes.length === 0) {
      console.log('No person nodes found, creating one for random groups')
      const personNode: CustomNode = {
        id: `person-${Date.now()}`,
        group: 1,
        noun: 'person',
        data: {
          displayName: 'Random Person',
          handle: '@random',
          avatar: '',
          description: 'A randomly generated person'
        }
      }
      nodes.push(personNode)
      personNodes.push(personNode)
    }

    console.log(
      `Adding random groups and lists for ${personNodes.length} person nodes`
    )

    // Group names
    const groupNames = [
      'Engineering Team',
      'Marketing Department',
      'Executive Board',
      'Research Group',
      'Design Team',
      'Sales Team',
      'Customer Support',
      'Product Management',
      'Quality Assurance',
      'Human Resources'
    ]

    // List names
    const listNames = [
      'Project Alpha Members',
      'Conference Attendees',
      'Workshop Participants',
      'Task Force',
      'Committee Members',
      'Event Organizers',
      'Beta Testers',
      'Contributors',
      'Volunteers',
      'Award Recipients'
    ]

    // Create timestamp
    const now = new Date()
    const timestamp = {
      seconds: Math.floor(now.getTime() / 1000),
      nanoseconds: now.getMilliseconds() * 1000000
    }

    // Number of groups and lists to create
    const numGroups = 2
    const numLists = 2

    // Create random groups
    for (let i = 0; i < numGroups; i++) {
      const groupName =
        groupNames[Math.floor(Math.random() * groupNames.length)]
      const groupId = `group-${Date.now()}-${i}`

      const groupNode: CustomNode = {
        id: groupId,
        group: 2, // Use a different group number for styling
        noun: 'group',
        data: {
          displayName: groupName,
          name: groupName,
          description: `A group of people working together as ${groupName}`,
          handle: '',
          avatar: ''
        }
      }

      nodes.push(groupNode)

      // Add random person nodes as members of this group
      if (personNodes.length > 0) {
        // Determine how many people to add to this group (between 3 and 5, or all if less than 3)
        const numMembers = Math.min(
          3 + Math.floor(Math.random() * 3),
          personNodes.length
        )

        // Randomly select person nodes
        const shuffled = [...personNodes].sort(() => 0.5 - Math.random())
        const selectedPersons = shuffled.slice(0, numMembers)

        // Create edges from persons to group
        for (const person of selectedPersons) {
          const edge: Edge = {
            source: person.id,
            target: groupId,
            verb: 'MemberOf',
            confidence: 0.9 + Math.random() * 0.1 // High confidence (0.9-1.0)
          }

          edges.push(edge)
        }
      }
    }

    // Create random lists
    for (let i = 0; i < numLists; i++) {
      const listName = listNames[Math.floor(Math.random() * listNames.length)]
      const listId = `list-${Date.now()}-${i}`

      const listNode: CustomNode = {
        id: listId,
        group: 3, // Use a different group number for styling
        noun: 'list',
        data: {
          displayName: listName,
          name: listName,
          description: `A list of people in ${listName}`,
          handle: '',
          avatar: ''
        }
      }

      nodes.push(listNode)

      // Add random person nodes as members of this list
      if (personNodes.length > 0) {
        // Determine how many people to add to this list (between 3 and 5, or all if less than 3)
        const numMembers = Math.min(
          3 + Math.floor(Math.random() * 3),
          personNodes.length
        )

        // Randomly select person nodes
        const shuffled = [...personNodes].sort(() => 0.5 - Math.random())
        const selectedPersons = shuffled.slice(0, numMembers)

        // Create edges from persons to list
        for (const person of selectedPersons) {
          const edge: Edge = {
            source: person.id,
            target: listId,
            verb: 'MemberOf',
            confidence: 0.9 + Math.random() * 0.1 // High confidence (0.9-1.0)
          }

          edges.push(edge)
        }
      }
    }
  }

  /**
   * Adds random edges between existing nodes for testing layout
   * @param nodes The array of nodes
   * @param edges The array of edges to add random edges to
   */
  private addRandomEdges(nodes: CustomNode[], edges: Edge[]): void {
    // Need at least 2 nodes to create edges
    if (nodes.length < 2) {
      console.log('Not enough nodes for random edges, creating some')
      // Create at least 2 nodes if there aren't enough
      for (let i = 0; i < 2 - nodes.length; i++) {
        const node: CustomNode = {
          id: `node-${Date.now()}-${i}`,
          group: 1,
          data: {
            displayName: `Random Node ${i+1}`,
            handle: `@random${i+1}`,
            avatar: '',
            description: 'A randomly generated node'
          }
        }
        nodes.push(node)
      }
    }

    // Create a set of existing edges to avoid duplicates
    const existingEdges = new Set<string>()
    edges.forEach((edge) => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : (edge.source as Node).id
      const targetId =
        typeof edge.target === 'string' ? edge.target : (edge.target as Node).id
      existingEdges.add(`${sourceId}-${targetId}`)
      existingEdges.add(`${targetId}-${sourceId}`) // Consider undirected graph
    })

    // Determine number of random edges to add (e.g., 20% of node count)
    const numRandomEdges = Math.max(Math.floor(nodes.length * 0.2), 1)
    console.log(`Adding ${numRandomEdges} random edges for layout testing`)

    // Get array of verb keys for random selection
    const verbKeys = Object.keys(EdgeVerbs) as Array<keyof typeof EdgeVerbs>

    // Person-to-Person appropriate verbs from Brainy verbTypes
    // These verbs better represent relationships between people
    const personToPersonVerbs: Array<keyof typeof EdgeVerbs> = [
      // Social relationship verbs
      'Knows',
      'Follows',
      'IsFriendOf',
      'IsRelatedTo',
      // Professional relationship verbs
      'Collaborates',
      'Mentors',
      'WorksWith'
    ]

    // Identify all Person nodes
    const personNodes = nodes.filter((node) => node['noun'] === 'person')

    // Create at least 2 person nodes if there aren't enough
    if (personNodes.length < 2) {
      console.log('Not enough person nodes for random edges, creating some')
      for (let i = 0; i < 2 - personNodes.length; i++) {
        const personNode: CustomNode = {
          id: `person-${Date.now()}-${i}`,
          group: 1,
          noun: 'person',
          data: {
            displayName: `Random Person ${i+1}`,
            handle: `@random${i+1}`,
            avatar: '',
            description: 'A randomly generated person'
          }
        }
        nodes.push(personNode)
        personNodes.push(personNode)
          }
      }

    // Track which Person nodes already have connections to other Person nodes
    const connectedPersonNodes = new Set<string>()

    // First, ensure each Person node has at least one connection to another Person node
    if (personNodes.length >= 2) {
      for (const sourceNode of personNodes) {
        // Skip if this Person node already has a connection to another Person
        if (connectedPersonNodes.has(sourceNode.id)) continue

        // Find a target Person node that is not the source node
        const targetPersonNodes = personNodes.filter(
          (node) => node.id !== sourceNode.id
        )

        if (targetPersonNodes.length > 0) {
          // Pick a random target Person node
          const targetNode =
            targetPersonNodes[
              Math.floor(Math.random() * targetPersonNodes.length)
              ]

          // Skip if edge already exists
          if (existingEdges.has(`${sourceNode.id}-${targetNode.id}`)) {
            // Mark both nodes as connected since an edge already exists between them
            connectedPersonNodes.add(sourceNode.id)
            connectedPersonNodes.add(targetNode.id)
            continue
          }

          // Pick a random appropriate verb for Person-to-Person relationship
          const randomVerb =
            personToPersonVerbs[
              Math.floor(Math.random() * personToPersonVerbs.length)
              ]
          const randomConfidence = 0.7 + Math.random() * 0.3 // Higher confidence (0.7-1.0) for Person-to-Person

          // Add the new edge with verb and confidence
          edges.push({
              source: sourceNode.id,
              target: targetNode.id,
              verb: randomVerb,
              confidence: randomConfidence
          } as Edge)

          // Mark as existing to avoid duplicates
          existingEdges.add(`${sourceNode.id}-${targetNode.id}`)
          existingEdges.add(`${targetNode.id}-${sourceNode.id}`) // Consider undirected graph

          // Mark both nodes as connected
          connectedPersonNodes.add(sourceNode.id)
          connectedPersonNodes.add(targetNode.id)
        }
      }
    }

    // Add additional random edges
    let addedEdges = 0
    let attempts = 0
    const maxAttempts = nodes.length * 10 // Avoid infinite loop

    while (addedEdges < numRandomEdges && attempts < maxAttempts) {
      attempts++

      // Pick two random nodes
      const sourceIndex = Math.floor(Math.random() * nodes.length)
      const targetIndex = Math.floor(Math.random() * nodes.length)

      // Skip if same node (no self-loops)
      if (sourceIndex === targetIndex) continue

      const sourceNode = nodes[sourceIndex]
      const targetNode = nodes[targetIndex]
      const sourceId = sourceNode.id
      const targetId = targetNode.id

      // Skip if edge already exists
      if (existingEdges.has(`${sourceId}-${targetId}`)) continue

      // Generate appropriate verb based on node types
      let randomVerb: keyof typeof EdgeVerbs
      let randomConfidence: number

      // If both nodes are Person nodes, use a Person-to-Person appropriate verb
      if (sourceNode['noun'] === 'person' && targetNode['noun'] === 'person') {
        randomVerb =
          personToPersonVerbs[
            Math.floor(Math.random() * personToPersonVerbs.length)
            ]
        randomConfidence = 0.7 + Math.random() * 0.3 // Higher confidence (0.7-1.0) for Person-to-Person
      } else {
        // For other node types, use any verb
        const randomVerbIndex = Math.floor(Math.random() * verbKeys.length)
        randomVerb = verbKeys[randomVerbIndex]
        randomConfidence = Math.random() // Random value between 0 and 1
      }

      // Add the new edge with verb and confidence
      edges.push({
          source: sourceId,
          target: targetId,
          verb: randomVerb,
          confidence: randomConfidence
      } as Edge)

      // Mark as existing to avoid duplicates
      existingEdges.add(`${sourceId}-${targetId}`)
      existingEdges.add(`${targetId}-${sourceId}`) // Consider undirected graph

      addedEdges++
    }

    if (attempts >= maxAttempts && addedEdges < numRandomEdges) {
      console.warn(
        `Could only add ${addedEdges} random edges after ${attempts} attempts`
      )
    }
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
    this.overlayContainer = null
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
      .attr('dy', '4')
      .attr('stdDeviation', '6')
      .attr('flood-color', md3Colors.shadow)
      .attr('flood-opacity', '0.25')

    // Add a glassy effect filter for the popup
    const glassyFilter = defs
      .append('filter')
      .attr('id', 'glassy-effect')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    // Add a more pronounced blur for the glassy effect
    glassyFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '2')  // Increased from 1 to 2 for more pronounced blur
      .attr('result', 'blur')

    // Add a subtle highlight to simulate glass reflection
    const feSpecularLighting = glassyFilter
      .append('feSpecularLighting')
      .attr('in', 'blur')
      .attr('surfaceScale', '3')
      .attr('specularConstant', '1')
      .attr('specularExponent', '20')
      .attr('lighting-color', '#FFFFFF')
      .attr('result', 'specOut')

    // Add a light source for the specular lighting
    feSpecularLighting
      .append('fePointLight')
      .attr('x', '0')
      .attr('y', '-50')
      .attr('z', '200')

    // Composite the specular lighting with the original
    const feComposite = glassyFilter
      .append('feComposite')
      .attr('in', 'specOut')
      .attr('in2', 'SourceGraphic')
      .attr('operator', 'arithmetic')
      .attr('k1', '0')
      .attr('k2', '0.3')
      .attr('k3', '0.7')
      .attr('k4', '0')
      .attr('result', 'litGraphic')

    // Add a subtle shadow with increased offset for better depth
    const feOffset = glassyFilter
      .append('feOffset')
      .attr('in', 'blur')
      .attr('dx', '0')
      .attr('dy', '3')  // Increased from 2 to 3 for more pronounced shadow
      .attr('result', 'offsetBlur')

    // Create a composite of the shadow, the lit graphic, and the original
    const feMerge = glassyFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'offsetBlur')
    feMerge.append('feMergeNode').attr('in', 'litGraphic')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Add opacity adjustment to make the filter 25% more transparent
    glassyFilter
      .append('feComponentTransfer')
      .append('feFuncA')
      .attr('type', 'linear')
      .attr('slope', '0.75') // 75% of original opacity (25% more transparent)

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        graphContainer.attr('transform', event.transform)
      })

    // Store reference to zoom behavior
    this.zoomBehavior = zoomBehavior

    svg.call(zoomBehavior as any)
      .on('click', (event) => {
        // Only handle clicks directly on the SVG background (not on nodes or edges)
        if (event.target === svg.node()) {
          // If there's a selected node, deselect it and restore all nodes and edges
          if (this.selectedNodeId) {
            this.selectedNodeId = null

            // Restore all nodes and edges to full opacity
            d3.selectAll('.node-group').transition().duration(300).style('opacity', 1);
            d3.selectAll('.edge-group').transition().duration(300).style('opacity', 1);

            // Remove 'selected' class from all nodes
            d3.selectAll('.node-group').classed('selected', false);

            // Close any existing popup
            if (this.activePopup) {
              this.activePopup.remove()
              this.activePopup = null
            }

            // Zoom to fit all nodes
            this.zoomToFit()
          }
        }
      });

    const graphContainer = svg
      .append('g')
      .attr('class', 'graph-content-container')

    // Create an overlay container for popups that won't be affected by zoom
    this.overlayContainer = svg
      .append('g')
      .attr('class', 'overlay-container')

    // Create edge groups to hold both the line and the label
    const linkGroup = graphContainer
      .append('g')
      .attr('class', 'edges')
      .selectAll('g')
      .data(edges)
      .join('g')
      .attr('class', 'edge-group')

    // Add the lines with thickness based on confidence
    const link = linkGroup
      .append('line')
      .attr('stroke', md3Colors.outline)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => {
        // Scale stroke width based on confidence with more dramatic effect (default to 1.5 if no confidence)
        return d.confidence ? 1 + d.confidence * 5 : 1.5
      })

    // Create a function to create a centered label group with two lines of text
    const createCenteredLabelGroup = (
      parent: d3.Selection<any, any, any, any>
    ) => {
      // Store reference to component for use in event handlers
      const component = this

      // Add edge label group to hold background and text
      const labelGroup = parent
        .append('g')
        .attr('class', 'edge-label-group')
        .style('cursor', 'pointer') // Add pointer cursor to indicate clickability

      // Add background circle for edge labels
      labelGroup
        .append('circle')
        .attr('class', 'edge-label-background')
        .attr('fill', 'white')
        .attr('fill-opacity', 0.95) // High opacity for better visibility
        .attr('stroke', md3Colors.outline)
        .attr('stroke-width', 0.5)
        .attr('stroke-opacity', 0.7)
        .attr('r', 0) // Will be updated based on text width
        .attr('cx', 0)
        .attr('cy', 0)
        .style('filter', 'url(#md-shadow)')

      // Add pie chart arc for confidence percentage (hollow in the middle for better text visibility)
      const arcGenerator = d3
        .arc<any>()
        .innerRadius(0) // Will be updated to create a hollow center
        .outerRadius(0) // Will be updated based on text width
        .startAngle(0)
        .endAngle(function(d) {
          const edge = d as Edge
          if (edge.confidence !== undefined) {
            // Convert confidence to radians (full circle = 2π)
            return edge.confidence * 2 * Math.PI
          }
          return 0
        })

      // Add the pie chart arc
      labelGroup
        .append('path')
        .attr('class', 'edge-label-pie')
        .attr('fill', '#4DB6AC') // Soft teal color
        .attr('fill-opacity', 0.7)
        .attr('d', function(d) {
          return arcGenerator(d)
        })

      // Add directional arrow at the bottom of the circle
      labelGroup
        .append('path')
        .attr('class', 'edge-label-arrow')
        .attr('d', 'M-5,0 L5,0 M2,-3 L5,0 L2,3') // Shorter arrow shape
        .attr('stroke', 'red') // Changed to red for better visibility
        .attr('stroke-width', 1.5)
        .attr('fill', 'none')
      // Initial transform is just for positioning, will be updated in tick function
      // No need to set rotation here as it will be set in the tick function

      // Create a text element for the label
      const labelText = labelGroup
        .append('text')
        .attr('class', 'edge-label')
        .attr('text-anchor', 'middle')
        .attr('fill', md3Colors.outline)
        .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
        .style('font-size', '12px') // Increased font size
        .style('font-weight', '900') // Extra bold text
        .style('pointer-events', 'none') // Allow clicks to pass through to the group

      // Helper function to split camelCase and capitalize each word
      const formatVerbLabel = (verb: string): string => {
        // Split camelCase into separate words
        const words = verb.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ')
        // Capitalize each word
        return words
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      // Add verb name (positioned slightly above center to avoid overlap with arrow)
      labelText
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '-5') // Moved up slightly from center
        .text(function(d) {
          const edge = d as Edge
          return edge.verb ? formatVerbLabel(EdgeVerbs[edge.verb]) : ''
        })

      // We no longer need the second line of text for confidence percentage
      // as we'll be using a pie chart visualization instead

      // Adjust background circle and pie chart size based on text width
      labelText.each(function() {
        const textWidth = this.getComputedTextLength()
        const padding = 24 // Increased padding for better appearance
        // Use the maximum of textWidth and a minimum size to ensure the circle is not too small
        const diameter = Math.max(textWidth + padding, 80)
        const radius = diameter / 2

        const parentGroup = d3.select(this.parentNode as Element)

        // Update circle radius
        parentGroup.select('circle').attr('r', radius)

        // Update pie chart arc radius - make it hollow in the middle (donut chart)
        arcGenerator.outerRadius(radius).innerRadius(radius * 0.8) // Set inner radius to 80% of outer radius to create a larger hollow center

        // Update the pie chart path with the correct data
        parentGroup.select('.edge-label-pie').attr('d', function(d) {
          return arcGenerator(d)
        })
      })

      // Add click event to select connected nodes and zoom to fit
      labelGroup.on('click', function(event, d) {
        event.stopPropagation() // Prevent event bubbling

        // Close any existing popup
        if (component.activePopup) {
          component.activePopup.remove()
          component.activePopup = null
          component.zoomToFit()
        }

        const edge = d as Edge
        const sourceId =
          typeof edge.source === 'string'
            ? edge.source
            : (edge.source as Node).id
        const targetId =
          typeof edge.target === 'string'
            ? edge.target
            : (edge.target as Node).id

        // Clear any previous selections
        d3.selectAll('.node-group').classed('selected', false)

        // Select the connected nodes
        d3.selectAll('.node-group').each(function(nodeData: any) {
          const node = nodeData as CustomNode
          if (node.id === sourceId || node.id === targetId) {
            d3.select(this)
              .classed('selected', true)
              .select('path') // Select the node background path
              .attr('stroke', md3Colors.primary) // Highlight with primary color
              .attr('stroke-width', 2) // Make the stroke thicker
              .attr('stroke-opacity', 1) // Full opacity
          }
        })

        // Zoom to fit the selected nodes using the component's method
        component.zoomToFitSelected()
      })

      return labelGroup
    }

    // Create a single centered label group for each edge
    linkGroup.each(function() {
      const linkElement = d3.select(this)
      createCenteredLabelGroup(linkElement)
    })

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

    // Add card background with different shapes based on node type
    node
      .append('path')
      .attr('d', (d) => {
        const w = nodeSize.width
        const h = nodeSize.height
        const r = nodeRadius
        const x = -w / 2
        const y = -h / 2

        // Check if node is a Group or List
        if (d['noun'] === 'group' || d['noun'] === 'list') {
          // Circle for Groups and Lists
          const radius = Math.max(w, h) / 1.5; // Larger circle
          return `
            M ${x + w/2},${y + h/2 - radius}
            a ${radius},${radius} 0 0 1 0,${2*radius}
            a ${radius},${radius} 0 0 1 0,${-2*radius}
            z
          `
        } else {
          // Path with squared left corners and rounded right corners for other nodes
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
        }
      })
      .attr('fill', (d) => {
        // Primary color fill for Groups and Lists to match view-toggle-button
        if (d['noun'] === 'group' || d['noun'] === 'list') {
          return md3Colors.primary // Match material theme primary color
        }
        // Default color palette for other nodes
        return nodeColorPalette[(d.group || 0) % nodeColorPalette.length]
      })
      .attr('stroke', (d) => {
        // Primary color outline for Groups and Lists
        if (d['noun'] === 'group' || d['noun'] === 'list') {
          return md3Colors.primary // Match material theme primary color
        }
        return md3Colors.outline
      })
      .attr('stroke-width', (d) => {
        // Thicker outline for Groups and Lists
        if (d['noun'] === 'group' || d['noun'] === 'list') {
          return 5 // Increased border thickness
        }
        return 0.5
      })
      .style('filter', 'url(#md-shadow)')

    // Add avatar image (filling left side of node box) - only for non-Group/List nodes
    node
      .filter((d) => d['noun'] !== 'group' && d['noun'] !== 'list')
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
      .on('error', function() {
        // If the image fails to load, replace with a default avatar
        d3.select(this).attr(
          'xlink:href',
          'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
        )
      })

    // Add separator line between avatar and text - only for non-Group/List nodes
    node
      .filter((d) => d['noun'] !== 'group' && d['noun'] !== 'list')
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

    // Add centered title text for Groups and Lists
    node
      .filter((d) => d['noun'] === 'group' || d['noun'] === 'list')
      .append('text')
      .text((d) => {
        const name = (d as CustomNode).data?.['name'] || ''
        return truncateText(name, nodeSize.width - 20, 14) // Use almost full width for centered text
      })
      .attr('x', 0) // Center horizontally
      .attr('y', 5) // Center vertically (slightly adjusted for visual balance)
      .attr('text-anchor', 'middle') // Center text
      .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', md3Colors.onPrimary) // White text for contrast on primary color background
      .style('pointer-events', 'none')
      .style('text-overflow', 'ellipsis')
      .style('white-space', 'nowrap')

    // Add name text for non-Group/List nodes
    node
      .filter((d) => d['noun'] !== 'group' && d['noun'] !== 'list')
      .append('text')
      .text((d) => {
        const displayName =
          (d as CustomNode).data?.['displayName'] ||
          (d as CustomNode).data?.['handle'] ||
          ''
        return truncateText(displayName, textAvailableWidth, 12)
      })
      .attr('x', -nodeSize.width / 2 + avatarWidth + textMargin) // Position to the right of the separator line with margin
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#000000') // Changed to black for better contrast with light backgrounds
      .style('pointer-events', 'none')
      .style('text-overflow', 'ellipsis') // Ensure text doesn't leak outside
      .style('white-space', 'nowrap')

    // Add email text (handle) - only for non-Group/List nodes
    node
      .filter((d) => d['noun'] !== 'group' && d['noun'] !== 'list')
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
      .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
      .style('font-size', '12px')
      .style('fill', '#333333') // Changed to dark gray for better contrast with light backgrounds
      .style('pointer-events', 'none')
      .style('text-overflow', 'ellipsis') // Ensure text doesn't leak outside
      .style('white-space', 'nowrap')

    node
      .on('mouseover', (event) => {
        const element = d3.select(event.currentTarget)
        element.select('path').attr('fill-opacity', 0.85)
        element
          .transition()
          .duration(150)
          .attr('transform', function(d) {
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
        element.select('path').attr('fill-opacity', 1)
        element
          .transition()
          .duration(150)
          .attr('transform', function(d) {
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
        // Close any existing popup before creating a new one
        if (this.activePopup) {
          this.activePopup.remove()
          this.activePopup = null
        }

        const customNode = d as CustomNode
        const clickedNodeId = customNode.id

        // If clicking the same node that's already selected, deselect it and restore all nodes and edges
        if (this.selectedNodeId === clickedNodeId) {
          this.selectedNodeId = null

          // Restore all nodes and edges to full opacity
          node.transition().duration(300).style('opacity', 1);
          linkGroup.transition().duration(300).style('opacity', 1);

          // Remove 'selected' class from all nodes
          node.classed('selected', false);

          // Zoom to fit all nodes
          this.zoomToFit()
        } else {
          // Set the clicked node as the selected node
          this.selectedNodeId = clickedNodeId

          // Find connected nodes (nodes that have an edge with the clicked node)
          const connectedNodeIds = new Set<string>()
          connectedNodeIds.add(clickedNodeId) // Add the clicked node itself

          // Check all edges to find connected nodes
          edges.forEach(edge => {
            const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as Node).id
            const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as Node).id

            if (sourceId === clickedNodeId) {
              connectedNodeIds.add(targetId)
            } else if (targetId === clickedNodeId) {
              connectedNodeIds.add(sourceId)
            }
          })

          // Fade out unrelated nodes and edges
          node.transition().duration(300).style('opacity', d => {
            return connectedNodeIds.has(d.id) ? 1 : 0.2
          });

          linkGroup.transition().duration(300).style('opacity', d => {
            const edge = d as Edge
            const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as Node).id
            const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as Node).id

            return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId) ? 1 : 0.1
          });

          // Add 'selected' class to the clicked node and its connected nodes
          node.classed('selected', d => connectedNodeIds.has(d.id));

          // Zoom to fit the selected nodes
          this.zoomToFitSelected();

          // Create popup for the clicked node using the overlay container
          if (this.overlayContainer) {
            this.createNodeInfoPopup(this.overlayContainer, customNode, event)
          }
        }
      })

    // Clean up any existing worker
    if (this.simulationWorker) {
      this.simulationWorker.terminate();
      this.simulationWorker = null;
    }

    // Create a new Web Worker for the force simulation
    this.simulationWorker = new Worker(
      new URL('../workers/force-simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Create a node position map for quick lookups
    const nodePositions = new Map<string, { x: number, y: number }>();

    // Initialize node positions randomly to avoid all nodes starting at the same position
    nodes.forEach(node => {
      node.x = Math.random() * width;
      node.y = Math.random() * height;
      nodePositions.set(node.id, { x: node.x, y: node.y });
    });

    // Handle messages from the worker
    this.simulationWorker.onmessage = (event) => {
      const { type, positions } = event.data;

      if (type === 'tick' || type === 'end') {
        // Update node positions in the map
        positions.forEach((pos: { id: string, x: number, y: number }) => {
          nodePositions.set(pos.id, { x: pos.x, y: pos.y });
        });

        // Update link positions
        link
          .attr('x1', function(d) {
            const edge = d as Edge;
            const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as CustomNode).id;
            const pos = nodePositions.get(sourceId);
            return pos ? pos.x : 0;
          })
          .attr('y1', function(d) {
            const edge = d as Edge;
            const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as CustomNode).id;
            const pos = nodePositions.get(sourceId);
            return pos ? pos.y : 0;
          })
          .attr('x2', function(d) {
            const edge = d as Edge;
            const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as CustomNode).id;
            const pos = nodePositions.get(targetId);
            return pos ? pos.x : 0;
          })
          .attr('y2', function(d) {
            const edge = d as Edge;
            const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as CustomNode).id;
            const pos = nodePositions.get(targetId);
            return pos ? pos.y : 0;
          });

        // Update edge label group positions
        linkGroup
          .selectAll('.edge-label-group')
          .attr('transform', function(d) {
            const edge = d as Edge;
            const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as CustomNode).id;
            const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as CustomNode).id;

            const sourcePos = nodePositions.get(sourceId);
            const targetPos = nodePositions.get(targetId);

            if (!sourcePos || !targetPos) return 'translate(0,0)';

            const sourceX = sourcePos.x;
            const sourceY = sourcePos.y;
            const targetX = targetPos.x;
            const targetY = targetPos.y;

            // Calculate vector from source to target
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length === 0) return 'translate(0,0)';

            // Normalize the vector
            const nx = dx / length;
            const ny = dy / length;

            // Calculate perpendicular vector for offset
            const px = -ny;
            const py = nx;

            // Position label at the center of the edge
            const offset = 0;
            const posX = sourceX + dx * 0.5 + px * offset;
            const posY = sourceY + dy * 0.5 + py * offset;

            return `translate(${posX}, ${posY})`;
          })
          .each(function(d) {
            const edge = d as Edge;
            const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as CustomNode).id;
            const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as CustomNode).id;

            const sourcePos = nodePositions.get(sourceId);
            const targetPos = nodePositions.get(targetId);

            if (!sourcePos || !targetPos) return;

            const sourceX = sourcePos.x;
            const sourceY = sourcePos.y;
            const targetX = targetPos.x;
            const targetY = targetPos.y;

            // Calculate angle in degrees from source to target
            const angle = (Math.atan2(targetY - sourceY, targetX - sourceX) * 180) / Math.PI;

            // Rotate the arrow
            d3.select(this)
              .select('.edge-label-arrow')
              .attr('transform', `translate(0, 10) rotate(${angle})`);
          });

        // Update node positions
        node.attr('transform', function(d) {
          const customNode = d as CustomNode;
          const pos = nodePositions.get(customNode.id);
          if (pos) {
            customNode.x = pos.x;
            customNode.y = pos.y;
          }
          return `translate(${customNode.x!},${customNode.y!})`;
        });
      }
    };

    // Start the simulation by sending the data to the worker
    this.simulationWorker.postMessage({
      nodes: nodes.map(n => ({
        id: n.id,
        group: n.group,
        noun: n['noun'],
        x: n.x,
        y: n.y
      })),
      edges: edges.map(e => ({
        source: typeof e.source === 'string' ? e.source : e.source.id,
        target: typeof e.target === 'string' ? e.target : e.target.id,
        verb: e.verb,
        confidence: e.confidence
      })),
      width,
      height,
      nodeSize: this.nodeSize
    });

    // Center graph on startup
    // Wait for a few ticks of the simulation for a more stable layout before centering.
    setTimeout(() => {
      this.zoomToFit()
    }, 300) // Increased timeout for simulation to stabilize more
  }

  /**
   * Creates an info popup for a node showing all its data
   * Uses data directly from the node
   * @param container The SVG container to add the popup to
   * @param node The node to show data for
   * @param event The click event that triggered the popup
   */
  private async createNodeInfoPopup(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    node: CustomNode,
    event: MouseEvent
  ) {
    // Material Design 3 Inspired Colors
    const md3Colors = {
      surface: 'rgba(200, 200, 220, 0.6)', // Lighter semi-transparent gray-blue for glassy effect
      onSurface: '#1C1B1F',
      outline: '#79747E',
      primary: '#6750A4',
      primaryDark: 'rgba(103, 80, 164, 0.75)', // Lighter semi-transparent purple for title bar
      onPrimaryDark: '#FFFFFF', // Text color for dark background
      shadow: 'rgba(0, 0, 0, 0.3)',
      labelBackground: 'rgba(245, 245, 255, 0.8)' // Slightly more opaque light blue-tinted background for better readability
    }

    // Create a group for the popup
    const popup = container.append('g').attr('class', 'node-info-popup')
    this.activePopup = popup as d3.Selection<
      SVGGElement,
      unknown,
      null,
      undefined
    >

    // Position popup in the top left corner of the view area
    const popupX = 20 // Fixed position with a small margin from left
    const popupY = 20 // Fixed position with a small margin from top

    // Popup dimensions (scaled down by 25%)
    const popupWidth = 375 // 500 * 0.75 = 375
    const popupHeight = 300 // 400 * 0.75 = 300
    const padding = 16
    const labelWidth = 112 // 150 * 0.75 = 112.5, rounded down to 112

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
      .style('filter', 'url(#glassy-effect)')

    // Add title bar background with rounded top corners and straight bottom using a path
    const titleBarHeight = 30 // Scaled down from 40 (75%)
    const cornerRadius = 6 // Scaled down from 8 (75%)

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
      .style('filter', 'url(#glassy-effect)') // Apply the same glassy effect

    // Add title (left-aligned but vertically centered in title bar) - using node's displayName
    popup
      .append('text')
      .attr('x', popupX + padding) // Left-aligned with padding
      .attr('y', popupY + titleBarHeight / 2) // Properly center vertically in the title bar
      .text(
        node.data?.['displayName'] ||
        node.data?.['handle'] ||
        'Node Information'
      )
      .attr('text-anchor', 'start') // Left-align the text
      .attr('dominant-baseline', 'middle') // Vertical alignment
      .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
      .style('font-size', '14px') // Scaled down from 18px (approximately 75%)
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
      .attr('r', 14) // Scaled down from 18 (approximately 75%)
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
      .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
      .style('font-size', '14px') // Scaled down from 18px (approximately 75%)
      .style('font-weight', 'bold')
      .style('fill', md3Colors.onPrimaryDark) // Match title text color
      .style('pointer-events', 'none')

    // Add hover effects
    closeButton
      .on('mouseenter', function() {
        buttonCircle.attr('fill', 'rgba(255, 255, 255, 0.12)') // Material ripple effect color
      })
      .on('mouseleave', function() {
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
      .style('filter', 'url(#glassy-effect)') // Apply the same glassy effect

    // Helper function to force wrap text to fit available width without ellipsis
    const forceWrapText = (text: string, maxWidth: number): string => {
      // Create a temporary text element to measure text width
      const tempText = popup
        .append('text')
        .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
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
        .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
        .style('font-size', '11px') // Scaled down from 14px (approximately 75%)
        .style('font-weight', 'bold')
        .style('fill', md3Colors.onSurface)
        .style('text-anchor', 'start')
        .style('dominant-baseline', 'middle')

      // Add value (with improved word wrapping for long values)
      const valueText = displayValue.toString()
      // First split by whitespace
      const words = valueText.split(/\s+/)
      let line = ''
      let lineHeight = 14 // Scaled down from 18 (approximately 75%)
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
              .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
              .style('font-size', '11px') // Scaled down from 14px (approximately 75%)
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
              .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
              .style('font-size', '11px') // Scaled down from 14px (approximately 75%)
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
              .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
              .style('font-size', '11px') // Scaled down from 14px (approximately 75%)
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
          .style('font-family', '\'Roboto\', \'Inter\', sans-serif')
          .style('font-size', '11px') // Scaled down from 14px (approximately 75%)
          .style('fill', md3Colors.onSurface)
          .style('dominant-baseline', 'middle')

        isFirstLine = false // No longer on first line
      }

      yOffset += lineHeight + 8 // Add space between rows
    }

    // Add basic node properties that we already have
    addDataRow('ID', node.id)
    addDataRow('Group', node.group)

    // Add all properties from the data object
    if (node.data) {
      // Add essential properties first
      addDataRow('Display Name', node.data['displayName'])
      addDataRow('Handle', node.data['handle'])
      if (node.data['noun']) {
        addDataRow('Type', node.data['noun'])
      }

      // Add all other properties
      Object.entries(node.data).forEach(([key, value]) => {
        // Skip properties we've already added
        if (key !== 'id' && key !== 'group' &&
            key !== 'displayName' && key !== 'handle' && key !== 'noun') {
          addDataRow(key, value)
        }
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

    // Removed click handler that closed popup when clicking outside
    // We want popups to only close when the close button is clicked

    // Add action buttons at the bottom of the popup
    const buttonBarHeight = 36 // Scaled down from 48 (75%)
    // Add spacing between content and button bar (15px buffer, scaled down from 20)
    const contentBuffer = 15
    // Adjust final popup height to include the buffer
    const adjustedPopupHeight = finalPopupHeight + contentBuffer
    // Update main popup background height
    popup.select('rect').attr('height', adjustedPopupHeight)
    // Update label area background height
    popup.select('path[fill="' + md3Colors.labelBackground + '"]').attr(
      'd',
      `
        M ${popupX} ${popupY + titleBarHeight}
        H ${popupX + labelWidth}
        V ${popupY + adjustedPopupHeight}
        H ${popupX + cornerRadius}
        Q ${popupX} ${popupY + adjustedPopupHeight} ${popupX} ${popupY + adjustedPopupHeight - cornerRadius}
        V ${popupY + titleBarHeight}
        Z
      `
    )

    const buttonBarY = popupY + adjustedPopupHeight - buttonBarHeight

    // Add button bar background
    popup
      .append('rect')
      .attr('width', popupWidth)
      .attr('height', buttonBarHeight)
      .attr('x', popupX)
      .attr('y', buttonBarY)
      .attr('fill', 'rgba(0, 0, 0, 0.02)')
      .attr('stroke', 'rgba(0, 0, 0, 0.08)')
      .attr('stroke-width', 1)
      .attr('stroke-top', 1)
      .attr('stroke-bottom', 0)
      .attr('stroke-left', 0)
      .attr('stroke-right', 0)
      .attr('rx', 0)
      .attr('ry', 8)
      .style('border-bottom-left-radius', '8px')
      .style('border-bottom-right-radius', '8px')

    // Calculate button positions
    const buttonCount = 4
    const buttonWidth = popupWidth / buttonCount
    const buttonCenters = Array.from(
      { length: buttonCount },
      (_, i) => popupX + i * buttonWidth + buttonWidth / 2
    )

    // Message button
    const messageButton = popup
      .append('g')
      .attr('class', 'action-button')
      .style('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation()
        this.messageProfile(node.id, event)
      })

    // Add tooltip for Direct Message button
    messageButton.append('title').text('Direct Message')

    messageButton
      .append('circle')
      .attr('cx', buttonCenters[0])
      .attr('cy', buttonBarY + buttonBarHeight / 2)
      .attr('r', 14) // Scaled down from 18 (approximately 75%)
      .attr('fill', 'transparent')
      .attr('stroke', 'none')

    messageButton
      .append('text')
      .attr('x', buttonCenters[0])
      .attr('y', buttonBarY + buttonBarHeight / 2)
      .text('message')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', '\'Material Icons\'')
      .style('font-size', '14px') // Scaled down from 18px (approximately 75%)
      .style('fill', md3Colors.primary)

    // Add hover effects for message button
    messageButton
      .on('mouseenter', function() {
        d3.select(this)
          .select('circle')
          .attr('fill', 'rgba(103, 80, 164, 0.08)')
      })
      .on('mouseleave', function() {
        d3.select(this).select('circle').attr('fill', 'transparent')
      })

    // Posts button
    const postsButton = popup
      .append('g')
      .attr('class', 'action-button')
      .style('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation()
        this.viewProfilePosts(node.id, event)
      })

    // Add tooltip for View Content button
    postsButton.append('title').text('View Content')

    postsButton
      .append('circle')
      .attr('cx', buttonCenters[1])
      .attr('cy', buttonBarY + buttonBarHeight / 2)
      .attr('r', 14) // Scaled down from 18 (approximately 75%)
      .attr('fill', 'transparent')
      .attr('stroke', 'none')

    postsButton
      .append('text')
      .attr('x', buttonCenters[1])
      .attr('y', buttonBarY + buttonBarHeight / 2)
      .text('article')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', '\'Material Icons\'')
      .style('font-size', '14px') // Scaled down from 18px (approximately 75%)
      .style('fill', md3Colors.primary) // changed to primary color

    // Add hover effects for posts button
    postsButton
      .on('mouseenter', function() {
        d3.select(this)
          .select('circle')
          .attr('fill', 'rgba(103, 80, 164, 0.08)') // changed to match primary color
      })
      .on('mouseleave', function() {
        d3.select(this).select('circle').attr('fill', 'transparent')
      })

    // Tag button
    const tagButton = popup
      .append('g')
      .attr('class', 'action-button')
      .style('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation()
        this.tagProfile(node.id, event)
      })

    // Add tooltip for Add Tags button
    tagButton.append('title').text('Add Tags')

    tagButton
      .append('circle')
      .attr('cx', buttonCenters[2])
      .attr('cy', buttonBarY + buttonBarHeight / 2)
      .attr('r', 14) // Scaled down from 18 (approximately 75%)
      .attr('fill', 'transparent')
      .attr('stroke', 'none')

    tagButton
      .append('text')
      .attr('x', buttonCenters[2])
      .attr('y', buttonBarY + buttonBarHeight / 2)
      .text('local_offer')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', '\'Material Icons\'')
      .style('font-size', '14px') // Scaled down from 18px (approximately 75%)
      .style('fill', md3Colors.primary) // changed to primary color

    // Add hover effects for tag button
    tagButton
      .on('mouseenter', function() {
        d3.select(this)
          .select('circle')
          .attr('fill', 'rgba(103, 80, 164, 0.08)') // changed to match primary color
      })
      .on('mouseleave', function() {
        d3.select(this).select('circle').attr('fill', 'transparent')
      })

    // Add to lists button
    const addToListsButton = popup
      .append('g')
      .attr('class', 'action-button')
      .style('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation()
        this.addToLists(node.id, event)
      })

    // Add tooltip for Add to List button
    addToListsButton.append('title').text('Add to List')

    addToListsButton
      .append('circle')
      .attr('cx', buttonCenters[3])
      .attr('cy', buttonBarY + buttonBarHeight / 2)
      .attr('r', 14) // Scaled down from 18 (approximately 75%)
      .attr('fill', 'transparent')
      .attr('stroke', 'none')

    addToListsButton
      .append('text')
      .attr('x', buttonCenters[3])
      .attr('y', buttonBarY + buttonBarHeight / 2)
      .text('playlist_add')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', '\'Material Icons\'')
      .style('font-size', '14px') // Scaled down from 18px (approximately 75%)
      .style('fill', md3Colors.primary)

    // Add hover effects for add to lists button
    addToListsButton
      .on('mouseenter', function() {
        d3.select(this)
          .select('circle')
          .attr('fill', 'rgba(103, 80, 164, 0.08)')
      })
      .on('mouseleave', function() {
        d3.select(this).select('circle').attr('fill', 'transparent')
      })

    // Zoom to show both the node and the popup
    setTimeout(() => {
      this.zoomToNodeAndPopup(node, {
        x: popupX,
        y: popupY,
        width: popupWidth,
        height: adjustedPopupHeight
      })
    }, 100) // Small delay to ensure popup is fully rendered
  }

  /**
   * Zooms to show the node and its connected nodes
   * @param node The node to show
   * @param popup The popup dimensions and position (not used since popup is now an overlay)
   */
  private zoomToNodeAndPopup(
    node: CustomNode,
    popup: { x: number; y: number; width: number; height: number }
  ) {
    if (!this.svgElement || !this.zoomBehavior) return

    const width = this.containerRef.nativeElement.offsetWidth
    const height = this.containerRef.nativeElement.offsetHeight

    // Calculate the bounding box that includes the node and its connected nodes
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity

    // Find connected nodes (nodes that have an edge with the clicked node)
    const connectedNodeIds = new Set<string>()
    connectedNodeIds.add(node.id) // Add the clicked node itself

    // Check all edges to find connected nodes
    const edges = this.d3Data().edges
    edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as Node).id
      const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as Node).id

      if (sourceId === node.id) {
        connectedNodeIds.add(targetId)
      } else if (targetId === node.id) {
        connectedNodeIds.add(sourceId)
      }
    })

    // Add all connected nodes to the bounding box
    this.nodes.forEach((n) => {
      const customNode = n as CustomNode
      if (customNode.x !== undefined && customNode.y !== undefined && connectedNodeIds.has(customNode.id)) {
        minX = Math.min(minX, customNode.x - this.nodeSize.width / 2)
        maxX = Math.max(maxX, customNode.x + this.nodeSize.width / 2)
        minY = Math.min(minY, customNode.y - this.nodeSize.height / 2)
        maxY = Math.max(maxY, customNode.y + this.nodeSize.height / 2)
      }
    })

    // No longer include popup in bounding box since it's fixed in the top left corner

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

  /**
   * Zooms to fit all nodes in the view
   */
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

  /**
   * Zooms to fit only the selected nodes in the view
   */
  public zoomToFitSelected() {
    if (!this.svgElement || !this.zoomBehavior) return

    const width = this.containerRef.nativeElement.offsetWidth
    const height = this.containerRef.nativeElement.offsetHeight
    const nodeSize = this.nodeSize // Store reference to nodeSize for use in the callback

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity

    let hasSelectedNodes = false

    // Calculate the bounding box of only the selected nodes
    d3.selectAll('.node-group.selected').each(function(d: any) {
      hasSelectedNodes = true
      const customNode = d as CustomNode
      if (customNode.x !== undefined && customNode.y !== undefined) {
        minX = Math.min(minX, customNode.x - nodeSize.width / 2)
        maxX = Math.max(maxX, customNode.x + nodeSize.width / 2)
        minY = Math.min(minY, customNode.y - nodeSize.height / 2)
        maxY = Math.max(maxY, customNode.y + nodeSize.height / 2)
      }
    })

    // If no nodes are selected, return without zooming
    if (!hasSelectedNodes) return

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
    }
  }

  ngOnDestroy() {
    // Clean up D3 simulation and SVG to prevent memory leaks if component is destroyed
    d3.select(this.containerRef.nativeElement).select('svg').remove()
    const simulation = d3.forceSimulation()
    if (simulation) {
      simulation.stop()
    }

    // Clean up Web Worker if it exists
    if (this.simulationWorker) {
      this.simulationWorker.terminate()
      this.simulationWorker = null
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

  /**
   * Handles the message button click for a profile
   * @param profileId The ID of the profile to message
   * @param event The click event
   */
  messageProfile(profileId: string, event: Event): void {
    event.stopPropagation()
    console.log(`Message profile: ${profileId}`)
    // Implement messaging functionality here
  }

  /**
   * Handles the posts button click for a profile
   * @param profileId The ID of the profile to view posts
   * @param event The click event
   */
  viewProfilePosts(profileId: string, event: Event): void {
    event.stopPropagation()
    console.log(`View posts for profile: ${profileId}`)
    // Implement posts viewing functionality here
  }

  /**
   * Handles the tag button click for a profile
   * @param profileId The ID of the profile to tag
   * @param event The click event
   */
  tagProfile(profileId: string, event: Event): void {
    event.stopPropagation()
    console.log(`Tag profile: ${profileId}`)
    // Implement tagging functionality here
  }

  /**
   * Handles the add to lists button click for a profile
   * @param profileId The ID of the profile to add to lists
   * @param event The click event
   */
  addToLists(profileId: string, event: Event): void {
    event.stopPropagation()
    console.log(`Add profile to lists: ${profileId}`)
    // Implement add to lists functionality here
  }
}
