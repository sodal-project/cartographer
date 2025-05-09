import {inject, Injectable} from '@angular/core'
import {
  Auth,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User
} from '@angular/fire/auth'
import {filter, Observable} from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public readonly user$: Observable<User | null>
  private auth = inject(Auth)

  constructor() {
    this.user$ = new Observable<User | null>((observer) => {
      return this.auth.onAuthStateChanged(observer)
    }).pipe(
      filter(user => user !== undefined) // Ignore undefined
    )
  }

  async googleSignIn(): Promise<void> {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(this.auth, provider)
    } catch (error) {
      console.error('Google Sign-In error:', error)
    }
  }

  async githubSignIn(): Promise<void> {
    const provider = new GithubAuthProvider()
    try {
      await signInWithPopup(this.auth, provider)
    } catch (error) {
      console.error('GitHub Sign-In error:', error)
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
}
