import { Component, OnInit } from '@angular/core'
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
export class SearchComponent implements OnInit {
  searchQuery: string = ''
  searchResults: SearchResult[] = []
  isLoading: boolean = false

  constructor(private firestore: Firestore) {}

  ngOnInit(): void {}

  async performSearch(): Promise<void> {
    if (!this.searchQuery.trim()) return

    this.isLoading = true
    this.searchResults = []

    try {
      const searchRef = collection(this.firestore, 'searchIndex')
      // You might want to adjust this query based on your Firebase structure
      const q = query(
        searchRef,
        where('keywords', 'array-contains', this.searchQuery.toLowerCase())
      )

      const querySnapshot = await getDocs(q)

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        this.searchResults.push({
          id: doc.id,
          title: data['title'],
          content: data['content'],
          score: data['score'] || 1.0
        })
      })

      // Sort results by score in descending order
      this.searchResults.sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('Search error:', error)
      // You might want to add error handling here
    } finally {
      this.isLoading = false
    }
  }

  viewDetails(result: SearchResult): void {
    // Implement detail view logic here
    console.log('Viewing details for:', result)
  }
}
