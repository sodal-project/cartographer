import { Injectable, OnDestroy } from '@angular/core'
import { Firestore, collection, getDocs } from '@angular/fire/firestore'
import { BrainyData } from '@soulcraft/brainy'
import { Profile } from '../models/cartographer.model'

@Injectable({
  providedIn: 'root'
})
export class ProfileService implements OnDestroy {
  private brainyService = new BrainyData()
  private initialized = false
  private initializationPromise: Promise<void> | null = null

  constructor(private firestore: Firestore) {
    // Initialize the service on creation
    this.initializationPromise = this.initialize()
  }

  /**
   * Returns a promise that resolves when the service is initialized
   */
  public waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve()
    }

    return this.initializationPromise || this.initialize()
  }

  /**
   * Checks if the service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Initializes the service by loading all profiles from Firebase
   * and storing them in BrainyData
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      console.log('ProfileService: Initializing...')

      // Initialize BrainyData
      await this.brainyService.init()

      // Load profiles from Firebase
      const profiles = await this.loadProfilesFromFirebase()

      // Store profiles in BrainyData
      if (profiles.length > 0) {
        await this.storeProfilesInBrainyData(profiles)
      }

      this.initialized = true
      console.log('ProfileService: Initialization complete')
    } catch (error) {
      console.error('ProfileService: Error during initialization', error)
    }
  }

  /**
   * Loads all profiles from the Firebase "Profiles" collection
   */
  private async loadProfilesFromFirebase(): Promise<Profile[]> {
    console.log('ProfileService: Loading profiles from Firebase...')

    try {
      const profilesCollection = collection(this.firestore, 'Profiles')
      const querySnapshot = await getDocs(profilesCollection)

      if (querySnapshot.empty) {
        console.warn('ProfileService: No profiles found in Profiles collection')
        return []
      }

      const profiles: Profile[] = []
      querySnapshot.forEach((doc) => {
        const profileData = doc.data() as Profile
        profileData.id = doc.id // Ensure the id is set from the document id
        profiles.push(profileData)
      })

      console.log(
        `ProfileService: Successfully loaded ${profiles.length} profiles from Firebase`
      )
      return profiles
    } catch (error) {
      console.error(
        'ProfileService: Error loading profiles from Firebase',
        error
      )
      return []
    }
  }

  /**
   * Stores profiles in BrainyData
   */
  private async storeProfilesInBrainyData(profiles: Profile[]): Promise<void> {
    console.log(
      `ProfileService: Storing ${profiles.length} profiles in BrainyData...`
    )

    try {
      // Convert profiles to the format expected by BrainyData.addBatch
      const items = profiles.map((profile) => ({
        // Use profile id as the vector/data (string)
        // Universal Sentence Encoder only supports string or string[] data
        vectorOrData: profile.id,
        // Include all profile data as metadata
        metadata: {
          ...profile
        }
      }))

      // Add the items to the Brainy database
      try {
        await this.brainyService.addBatch(items)
      } catch (addBatchError) {
        // Check if this is the "Neighbor not found" error
        if (addBatchError instanceof Error &&
            addBatchError.message &&
            addBatchError.message.includes('Neighbor with ID') &&
            addBatchError.message.includes('not found in pruneConnections')) {
          console.warn(`HNSW index error: ${addBatchError.message}`)
          console.log('Attempting to reinitialize BrainyData to recover from HNSW index error')

          // Try to reinitialize
          await this.brainyService.init()

          // Try addBatch again after reinitialization
          try {
            await this.brainyService.addBatch(items)
          } catch (retryError) {
            console.error('Failed to recover from HNSW index error:', retryError)
            throw retryError
          }
        } else {
          // For other errors, rethrow
          throw addBatchError
        }
      }

      console.log('ProfileService: Successfully stored profiles in BrainyData')
    } catch (error) {
      console.error(
        'ProfileService: Error storing profiles in BrainyData',
        error
      )
    }
  }

  ngOnDestroy(): void {
    // Clean up if needed
  }
}
