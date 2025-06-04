import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  WritableSignal,
  inject,
  Injector,
  runInInjectionContext,
  effect
} from '@angular/core'
import { ViewStateService } from '../services/view-state.service'
import { Firestore, collection, collectionData } from '@angular/fire/firestore'
import { MatIcon } from '@angular/material/icon'
import {
  MatCard,
  MatCardActions,
  MatCardAvatar,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card'
import { FormsModule } from '@angular/forms'
import { BrainyData } from '@soulcraft/brainy'
import { ProfileService } from '../services/profile.service'
import { GraphNode, GraphEdge } from '../models/cartographer.model'
import { Observable } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'

interface SearchResult {
  profile: {
    id: string
    data: any
    [key: string]: any
  }
  similarity: number
}

@Component({
  selector: 'search',
  templateUrl: './search.component.html',
  imports: [
    MatIcon,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatCardActions,
    MatCardAvatar,
    FormsModule,
    MatCardSubtitle,
    MatCardTitle,
    MatButtonModule,
    MatTooltipModule
  ],
  styleUrls: ['./search.component.sass']
})
export class SearchComponent implements OnInit, OnDestroy {
  // Convert state properties to signals
  searchResults: WritableSignal<SearchResult[]> = signal([])
  isLoading: WritableSignal<boolean> = signal(false)
  isOffline: WritableSignal<boolean> = signal(!navigator.onLine)

  // Firestore data signals
  private graphNodes: WritableSignal<GraphNode[]> = signal([])
  private graphEdges: WritableSignal<GraphEdge[]> = signal([])
  private brainyResults: WritableSignal<any[]> = signal([])

  // Use inject for dependency injection
  private firestore = inject(Firestore)
  private profileService = inject(ProfileService)
  private brainyService = new BrainyData()
  private injector = inject(Injector)
  private router = inject(Router)
  private viewStateService = inject(ViewStateService)

  // Store references to event listener functions for cleanup
  private onlineListener = () => this.isOffline.set(false)
  private offlineListener = () => this.isOffline.set(true)

  constructor() {
    // Set up event listeners for online/offline status
    window.addEventListener('online', this.onlineListener)
    window.addEventListener('offline', this.offlineListener)
  }

  ngOnDestroy(): void {
    // Remove event listeners to prevent memory leaks
    window.removeEventListener('online', this.onlineListener)
    window.removeEventListener('offline', this.offlineListener)
  }

  ngOnInit(): void {
    // Ensure the current view is set to 'search' when this component is initialized
    this.viewStateService.setCurrentView('search')

    // Set up Firestore data collection
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

        // Combine data when Firestore data changes
        this.combineResults()
      })
    })

    // Wait for ProfileService to initialize before fetching data
    this.profileService
      .waitForInitialization()
      .then(() => {
        console.log('ProfileService initialized, fetching data')
        this.fetchData()
      })
      .catch((error) => {
        console.error('Error initializing ProfileService:', error)
      })
  }

  /**
   * Fetches data from BrainyData
   * @param limit The maximum number of results to return (default: 100)
   */
  async fetchData(limit: number = 100): Promise<void> {
    this.isLoading.set(true)
    this.brainyResults.set([])

    try {
      console.log('Fetching data from Brainy database')

      // Initialize the database if needed
      await this.brainyService.init()

      // Use an empty string query to get all results
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
            this.isLoading.set(false)
            return
          }
        } else {
          // For other search errors, log and return
          console.error('Error searching in Brainy database:', searchError)

          // If we're offline and the error is related to network connectivity,
          // provide a more specific error message
          if (this.isOffline()) {
            console.warn(
              'Data fetch attempted while offline. Some results may be from cache.'
            )
          }

          this.isLoading.set(false)
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
        `Data from Brainy: ${transformedResults.length} profiles found`
      )

      if (transformedResults.length > 0) {
        // Sort by similarity score (highest first)
        transformedResults.sort((a, b) => b.similarity - a.similarity)
        this.brainyResults.set(transformedResults)

        // Combine results from both sources
        this.combineResults()
      } else {
        console.warn('No profiles found in BrainyData.')
      }

      // If we're offline but got results from cache, update the UI to reflect this
      if (this.isOffline() && transformedResults.length > 0) {
        console.log('Data fetched using cached data while offline')
      }
    } catch (error) {
      console.error('Error fetching data from Brainy:', error)

      // If we're offline and the error is related to network connectivity,
      // provide a more specific error message
      if (this.isOffline()) {
        console.warn(
          'Data fetch attempted while offline. Some results may be from cache.'
        )
      }
    } finally {
      this.isLoading.set(false)
    }
  }

  /**
   * Combines results from Firestore and BrainyData
   */
  private combineResults(): void {
    const graphNodes = this.graphNodes()
    const brainyResults = this.brainyResults()
    const combinedResults: SearchResult[] = []

    // Add Firestore nodes to the combined results
    if (graphNodes.length > 0) {
      console.log(`Adding ${graphNodes.length} nodes from Firestore`)

      // Convert GraphNode objects to SearchResult format
      const firestoreResults: SearchResult[] = graphNodes.map((node) => ({
        profile: {
          ...node,
          id: node.id,
          data: node.data || {}
        },
        similarity: 1.0 // Default similarity for Firestore nodes
      }))

      combinedResults.push(...firestoreResults)
    }

    // Add BrainyData results to the combined results
    if (brainyResults.length > 0) {
      console.log(`Adding ${brainyResults.length} results from BrainyData`)

      // Use a Set to track IDs that are already in the combined results
      const existingIds = new Set(
        combinedResults.map((result) => result.profile.id)
      )

      // Add BrainyData results that don't already exist in the combined results
      for (const result of brainyResults) {
        if (!existingIds.has(result.profile.id)) {
          combinedResults.push(result)
          existingIds.add(result.profile.id)
        } else {
          // If the node already exists, update its data with BrainyData
          const existingResult = combinedResults.find(
            (r) => r.profile.id === result.profile.id
          )
          if (existingResult) {
            // Update similarity if BrainyData has a higher score
            if (result.similarity > existingResult.similarity) {
              existingResult.similarity = result.similarity
            }

            // Merge data properties
            existingResult.profile = {
              ...existingResult.profile,
              ...result.profile
            }
          }
        }
      }
    }

    // Sort by similarity score (highest first)
    combinedResults.sort((a, b) => b.similarity - a.similarity)

    console.log(`Combined results: ${combinedResults.length} profiles`)
    this.searchResults.set(combinedResults)
  }

  /**
   * Converts a camelCase string to Title Case Words
   * @param str The camelCase string to convert
   * @returns The string converted to Title Case Words
   */
  formatCamelCase(str: string): string {
    // Insert a space before all uppercase letters, then capitalize the first letter of each word
    return (
      str
        // Insert space before uppercase letters
        .replace(/([A-Z])/g, ' $1')
        // Capitalize the first letter of the string
        .replace(/^./, (str) => str.toUpperCase())
        // Ensure the rest is properly capitalized (first letter of each word)
        .replace(/\s[a-z]/g, (match) => match.toUpperCase())
        .trim()
    )
  }

  /**
   * Helper method to convert data object to an array of key-value pairs for iteration in the template
   * @param data The data object to convert
   * @returns An array of key-value pairs
   */
  getDataEntries(data: {
    [key: string]: any
  }): { key: string; value: any; isObject: boolean; isArray: boolean }[] {
    if (!data) return []

    return Object.entries(data).map(([key, value]) => {
      // Format the value based on its type
      let displayValue = value
      let isObject = false
      let isArray = false

      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          isArray = true
          displayValue = value
        } else {
          isObject = true
          displayValue = value
        }

        // Fallback if we can't process it as a structured object
        if (!isObject && !isArray) {
          try {
            displayValue = JSON.stringify(value)
          } catch (e) {
            displayValue = '[Complex Object]'
          }
        }
      }

      // Format the key from camelCase to Title Case Words
      const formattedKey = this.formatCamelCase(key)

      return { key: formattedKey, value: displayValue, isObject, isArray }
    })
  }

  /**
   * Helper method to convert an object to an array of key-value pairs for nested display
   * @param obj The object to convert
   * @returns An array of key-value pairs
   */
  getObjectEntries(obj: { [key: string]: any }): { key: string; value: any }[] {
    if (!obj) return []

    return Object.entries(obj).map(([key, value]) => {
      // Format the value based on its type
      let displayValue = value
      if (typeof value === 'object' && value !== null) {
        try {
          displayValue = JSON.stringify(value)
        } catch (e) {
          displayValue = '[Complex Object]'
        }
      }

      // Format the key from camelCase to Title Case Words
      const formattedKey = this.formatCamelCase(key)

      return { key: formattedKey, value: displayValue }
    })
  }

  /**
   * Handles image loading errors by setting a fallback image
   * @param event The error event from the img element
   */
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement
    if (imgElement && imgElement instanceof HTMLImageElement) {
      imgElement.src =
        'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
    }
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
