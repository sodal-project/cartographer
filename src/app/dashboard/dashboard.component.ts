import {
  Component,
  inject,
  signal,
  WritableSignal,
  ChangeDetectionStrategy,
  effect
} from '@angular/core'
import {
  Firestore,
  disableNetwork,
  enableNetwork,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  limit,
  setDoc,
  vector
} from '@angular/fire/firestore'
import { AuthService } from '../auth.service'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { RegistryService } from '../services/registry.service'
import { UpdateService } from '../services/update.service'
import {
  BrainyData,
  defaultEmbeddingFunction,
  cosineDistance
} from '@soulcraft/brainy'
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router'
import { version } from '../../../package.json'
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu'
import { MatExpansionModule } from '@angular/material/expansion'
import { Service } from '../models/service.model'
import { Profile } from '../models/cartographer.model'

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatExpansionModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private registryService = inject(RegistryService)
  protected readonly authService = inject(AuthService)
  private readonly router = inject(Router)
  private readonly firestore = inject(Firestore)
  protected readonly updateService = inject(UpdateService)
  private readonly brainyService = new BrainyData()
  public showSideMenu: WritableSignal<boolean> = signal(false)
  public onlineStatus: WritableSignal<boolean> = signal(navigator.onLine)
  public readonly updateAvailable = this.updateService.updateAvailable
  public readonly version = signal(version)
  private servicesCache: Service[] | null = null
  public services: WritableSignal<Service[]> = signal([])
  public profiles: WritableSignal<Profile[]> = signal([])

  // Search related properties
  public vectorSearchQuery: WritableSignal<string> = signal('')
  public localSearchQuery: WritableSignal<string> = signal('')
  public vectorSearchResults: WritableSignal<Profile[]> = signal([])
  public filteredProfiles: WritableSignal<Profile[]> = signal([])
  public filteredServices: WritableSignal<Service[]> = signal([])
  public isSearching: WritableSignal<boolean> = signal(false)
  public currentView: WritableSignal<'explore' | 'search'> = signal('explore')

  constructor() {
    window.addEventListener('online', () => this.onlineStatus.set(true))
    window.addEventListener('offline', () => this.onlineStatus.set(false))

    // Create an effect to watch for changes to the RegistryService's services signal
    effect(() => {
      const services = this.registryService.services()
      if (services) {
        console.log(
          'DashboardComponent: Services updated from RegistryService:',
          services
        )
        this.services.set(services)
        this.servicesCache = services
      }
    })

    // Fetch services when component initializes (for the left-hand menu)
    this.fetchServices()

    // Fetch profiles when component initializes (for search)
    this.fetchProfiles()

    // If we have a local search query, apply it to the updated profiles
    if (this.localSearchQuery()) {
      this.performLocalSearch(this.localSearchQuery())
    }
  }

  toggleSideMenu(): void {
    this.showSideMenu.update((value) => !value)
  }

  async toggleOnlineStatus(): Promise<void> {
    this.onlineStatus.update((value) => !value)

    if (!this.onlineStatus()) {
      await disableNetwork(this.firestore)
    } else {
      await enableNetwork(this.firestore)
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout()
    // Ensure we navigate to the login page after logout
    // Use a small timeout to ensure the auth state has been updated
    setTimeout(() => {
      this.router.navigate(['/login'])
    }, 100)
  }

  /**
   * Fetches the services list from Firestore _services collection
   * This is used for populating the left-hand services menu
   */
  fetchServices(): void {
    console.log('DashboardComponent: Fetching services from Firestore...')

    // Use the RegistryService to fetch services
    // The effect in the constructor will handle updating the services signal
    this.registryService.fetchServices()
  }

  /**
   * Fetches profiles from the Firestore Profiles collection
   * This is used for search functionality
   */
  async fetchProfiles(): Promise<void> {
    console.log('DashboardComponent: Fetching profiles from Firestore...')

    try {
      this.isSearching.set(true)

      // Get profiles from Firestore Profiles collection
      const profilesCollection = collection(this.firestore, 'Profiles')
      const querySnapshot = await getDocs(profilesCollection)

      if (querySnapshot.empty) {
        console.warn(
          'DashboardComponent: No profiles found in Profiles collection'
        )
        this.profiles.set([])
        return
      }

      const profiles: Profile[] = []
      querySnapshot.forEach((doc) => {
        const profileData = doc.data() as Profile
        profileData.id = doc.id // Ensure the id is set from the document id
        profiles.push(profileData)
      })

      console.log(
        'DashboardComponent: Successfully fetched profiles:',
        profiles
      )
      this.profiles.set(profiles)
    } catch (error) {
      console.error('DashboardComponent: Error fetching profiles:', error)
    } finally {
      this.isSearching.set(false)
    }
  }

  /**
   * Returns the services for display in the left-hand menu
   * @returns An array of Service objects from the _services collection
   */
  staticServices(): Service[] {
    // Always return services from the _services collection for the left-hand menu
    return this.services()
  }

  /**
   * Creates a vector index in Firestore if it doesn't exist
   * @returns A Promise that resolves when the index is created or verified
   */
  private async createVectorIndexIfNeeded(): Promise<void> {
    try {
      // Check if the vector index exists
      const indexesCollection = collection(this.firestore, '_indexes')
      const indexDoc = doc(indexesCollection, 'profiles_embedding')
      const indexSnapshot = await getDoc(indexDoc)

      if (!indexSnapshot.exists()) {
        console.log('Vector index does not exist, creating it...')

        // Generate a sample embedding to determine dimensions
        const sampleEmbedding = await defaultEmbeddingFunction('sample text')
        const dimensions = sampleEmbedding.length

        console.log(`Determined embedding dimensions: ${dimensions}`)

        // Create the vector index
        await setDoc(indexDoc, {
          name: 'profiles_embedding',
          collection: 'Profiles',
          field: '_graph_node.embedding',
          dimensions: dimensions,
          created: new Date(),
          status: 'active'
        })

        console.log('Vector index created successfully')
      } else {
        console.log('Vector index already exists')
      }
    } catch (error) {
      console.error('Error creating vector index:', error)
      throw error
    }
  }

  /**
   * Calculates the cosine similarity between two vectors
   * @param a The first vector
   * @param b The second vector
   * @returns The cosine similarity as a number between -1 and 1
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    // cosineDistance returns a value between 0 (identical) and 2 (opposite)
    // We need to convert it to a similarity value between -1 and 1
    const distance = cosineDistance(a, b)

    // Convert distance to similarity: 0 distance -> 1 similarity, 2 distance -> -1 similarity
    return 1 - distance / 2
  }

  /**
   * Performs a vector search in Firestore
   * @param embedding The vector embedding to search with
   * @param maxResults The maximum number of results to return
   * @returns A Promise that resolves to the search results
   */
  private async vectorSearch(
    embedding: number[],
    maxResults: number = 10
  ): Promise<any[]> {
    try {
      // Ensure the vector index exists
      await this.createVectorIndexIfNeeded()

      // Convert the embedding to a Firestore VectorValue
      const vectorEmbedding = vector(embedding)

      // Note: Firestore has vector types but doesn't yet expose direct vector search capabilities
      // in the client SDK. In a production environment, you might use a Cloud Function or
      // server-side implementation to perform the vector search.

      // For now, we'll fetch profiles and calculate similarity locally
      // This is not efficient for large collections and should be replaced with
      // Firestore's vector search when it becomes available
      console.log(
        'Performing vector search with embedding of dimension:',
        embedding.length
      )

      const profilesCollection = collection(this.firestore, 'Profiles')
      const querySnapshot = await getDocs(profilesCollection)

      const results: any[] = []

      querySnapshot.forEach((docSnapshot) => {
        const profile: Profile = docSnapshot.data() as Profile

        // Check if the profile has an embedding
        if (profile._graph_node && profile._graph_node.embedding) {
          // Calculate cosine similarity
          const similarity = this.cosineSimilarity(
            embedding,
            profile._graph_node.embedding
          )

          results.push({
            profile,
            id: docSnapshot.id,
            similarity
          })
        }
      })

      // Sort by similarity (highest first) and limit the results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults)
    } catch (error) {
      console.error('Error performing vector search:', error)
      throw error
    }
  }

  /**
   * Performs a vector search in Firestore using the defaultEmbeddingFunction from @soulcraft/brainy
   * @param query The search query
   */
  async performVectorSearch(query: string): Promise<void> {
    // Update the signal value
    this.vectorSearchQuery.set(query)

    if (!query.trim()) {
      this.vectorSearchResults.set([])
      this.filteredProfiles.set([])
      return
    }

    this.isSearching.set(true)

    try {
      console.log('Converting query to vector embedding:', query)

      // Convert the query to a vector embedding using the defaultEmbeddingFunction from @soulcraft/brainy
      const embedding = await defaultEmbeddingFunction(query)

      console.log(
        'Query converted to embedding with dimensions:',
        embedding.length
      )

      // Perform vector search against the Profiles collection
      const searchResults = await this.vectorSearch(embedding)

      console.log('Vector search results:', searchResults)

      // Initialize the database if needed
      await this.brainyService.init()

      // Store the results in the Brainy database
      // Convert search results to the format expected by BrainyData.addBatch
      const items = searchResults.map((result) => ({
        vectorOrData: embedding, // Use the same embedding for all results
        metadata: {
          ...result.profile,
          similarity: result.similarity
        }
      }))

      // Add the items to the Brainy database
      await this.brainyService.addBatch(items)

      // Extract profiles from search results and update the vector search results signal
      const profiles = searchResults.map((result) => result.profile)
      this.vectorSearchResults.set(profiles as Profile[])

      // Also update the filtered profiles for display
      this.filteredProfiles.set(profiles as Profile[])

      // Clear local search when vector search is performed
      this.localSearchQuery.set('')

      // Switch to explore view to show the results
      this.currentView.set('explore')

      console.log('Vector search completed and results stored in Brainy')
    } catch (error) {
      console.error('Error performing vector search:', error)
    } finally {
      this.isSearching.set(false)
    }
  }

  /**
   * Filters the local profiles based on the search query
   * @param query The search query
   */
  performLocalSearch(query: string): void {
    // Update the signal value
    this.localSearchQuery.set(query)

    if (!query.trim()) {
      // If vector search results exist, use those as the base for filtering
      if (this.vectorSearchResults().length > 0) {
        this.filteredProfiles.set(this.vectorSearchResults())
      } else {
        this.filteredProfiles.set(this.profiles())
      }
      return
    }

    const q = query.toLowerCase()

    // Determine which dataset to filter
    const profilesToFilter =
      this.vectorSearchResults().length > 0
        ? this.vectorSearchResults()
        : this.profiles()

    // Filter profiles based on their id
    const filteredProfiles = profilesToFilter.filter((profile) =>
      profile.id.toLowerCase().includes(q)
    )

    console.log('Local search results:', filteredProfiles)
    this.filteredProfiles.set(filteredProfiles)
  }

  /**
   * Activates the available update or checks for updates if none are available
   */
  activateUpdate(): void {
    if (this.updateAvailable()) {
      // If an update is available, activate it
      this.updateService.activateUpdate().then((success) => {
        if (!success) {
          console.error('Failed to activate update')
        }
      })
    } else {
      // If no update is available, check for updates
      this.updateService.checkForUpdate()
    }
  }

  /**
   * Toggles between explore and search views
   */
  toggleView(): void {
    const newView = this.currentView() === 'explore' ? 'search' : 'explore'
    this.currentView.set(newView)
    this.router.navigate([`/dashboard/${newView}`])
  }
}
