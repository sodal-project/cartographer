import {inject, Injectable, signal, WritableSignal} from '@angular/core'
import {toObservable} from '@angular/core/rxjs-interop'
import {
  Auth,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User
} from '@angular/fire/auth'
import {Observable} from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public readonly user: WritableSignal<User | null> = signal(null)
  // Keep the Observable for backward compatibility
  public readonly user$: Observable<User | null>
  private auth = inject(Auth)

  constructor() {
    // Set up the auth state listener
    this.auth.onAuthStateChanged(user => {
      // Only update the signal if user is defined (not undefined)
      if (user !== undefined) {
        this.user.set(user)
      }
    })

    // Initialize the user$ Observable from the user signal for backward compatibility
    this.user$ = toObservable(this.user)
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
