import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  WritableSignal,
  inject
} from '@angular/core'
import { FirebaseApp } from '@angular/fire/app'
import {
  Firestore,
  collection,
  query,
  where,
  getDocs
} from '@angular/fire/firestore'
import { MatIcon } from '@angular/material/icon'
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { MatInput } from '@angular/material/input'
import { FormsModule } from '@angular/forms'
import { MatButton, MatIconButton } from '@angular/material/button'

interface SearchResult {
  id: string
  title: string
  content: string
  score: number
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
    MatProgressSpinner,
    MatInput,
    FormsModule,
    MatIconButton,
    MatButton,
    MatCardSubtitle,
    MatCardTitle
  ],
  styleUrls: ['./search.component.sass']
})
export class SearchComponent implements OnInit, OnDestroy {
  // Convert state properties to signals
  searchQuery: WritableSignal<string> = signal('')
  searchResults: WritableSignal<SearchResult[]> = signal([])
  isLoading: WritableSignal<boolean> = signal(false)
  isOffline: WritableSignal<boolean> = signal(!navigator.onLine)

  // Use inject for dependency injection
  private firestore = inject(Firestore)

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

  ngOnInit(): void {}

  async performSearch(): Promise<void> {
    if (!this.searchQuery().trim()) return

    this.isLoading.set(true)
    this.searchResults.set([])

    try {
      const searchRef = collection(this.firestore, 'searchIndex')
      const q = query(
        searchRef,
        where('keywords', 'array-contains', this.searchQuery().toLowerCase())
      )

      const querySnapshot = await getDocs(q)

      const results: SearchResult[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        results.push({
          id: doc.id,
          title: data['title'],
          content: data['content'],
          score: data['score'] || 1.0
        })
      })

      results.sort((a, b) => b.score - a.score)

      this.searchResults.set(results)

      // If we're offline but got results from cache, update the UI to reflect this
      if (this.isOffline() && results.length > 0) {
        console.log('Search completed using cached data while offline')
      }
    } catch (error) {
      console.error('Search error:', error)

      // If we're offline and the error is related to network connectivity,
      // provide a more specific error message
      if (this.isOffline()) {
        console.warn('Search attempted while offline. Some results may be from cache.')
      }
    } finally {
      this.isLoading.set(false)
    }
  }

  viewDetails(result: SearchResult): void {
    // This method receives a SearchResult object directly, not from a signal
    // It's typically called from the template with an item from *ngFor="let result of searchResults()"
    console.log('Viewing details for:', result)
  }
}
