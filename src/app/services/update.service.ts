import { Injectable, inject, signal, WritableSignal } from '@angular/core'
import { SwUpdate } from '@angular/service-worker'
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  private swUpdate = inject(SwUpdate)
  private currentVersion: string = environment.version
  private storedVersion: string | null = null

  // Signal to track if an update is available
  public updateAvailable: WritableSignal<boolean> = signal(false)

  constructor() {
    // Get the stored version from localStorage
    this.storedVersion = localStorage.getItem('app_version')

    // Check if this is a new version
    if (this.storedVersion !== this.currentVersion) {
      console.log(
        `Version change detected: ${this.storedVersion || 'none'} -> ${this.currentVersion}`
      )
      this.clearAllData().then(() => {
        // Update the stored version after clearing data
        localStorage.setItem('app_version', this.currentVersion)
        console.log('All data cleared for new version')
      })
    }

    if (this.swUpdate.isEnabled) {
      // Initial check for updates
      this.checkForUpdate()

      // Subscribe to version updates
      this.swUpdate.versionUpdates.subscribe(() => {
        console.log('Update available')
        this.updateAvailable.set(true)
      })
    }
  }

  /**
   * Check for available updates
   */
  public checkForUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate
        .checkForUpdate()
        .then(() => console.log('Checked for updates'))
        .catch((err) => console.error('Error checking for updates:', err))
    }
  }

  /**
   * Clear all application data
   * This includes caches, IndexedDB, and localStorage
   * Preserves authentication data and origin private file system
   */
  private async clearAllData(): Promise<void> {
    try {
      // Clear Service Worker caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys()
        await Promise.all(cacheKeys.map((key) => caches.delete(key)))
        console.log('Service Worker caches cleared')
      }

      // Clear IndexedDB databases (except Firebase authentication)
      if ('indexedDB' in window) {
        const databases = await window.indexedDB.databases()
        databases.forEach((db) => {
          if (db.name && !db.name.includes('firebaseLocalStorage')) {
            window.indexedDB.deleteDatabase(db.name)
            console.log(`IndexedDB database ${db.name} deleted`)
          } else if (db.name && db.name.includes('firebaseLocalStorage')) {
            console.log(`Preserving authentication database: ${db.name}`)
          }
        })
      }

      // Save authentication and version data from localStorage
      const versionValue = localStorage.getItem('app_version')
      const authItems = new Map<string, string>()

      // Save all Firebase authentication items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('firebase:')) {
          authItems.set(key, localStorage.getItem(key) || '')
          console.log(`Preserving authentication data: ${key}`)
        }
      }

      // Clear localStorage
      localStorage.clear()

      // Restore authentication items
      authItems.forEach((value, key) => {
        localStorage.setItem(key, value)
      })

      // Restore version value
      if (versionValue) {
        localStorage.setItem('app_version', versionValue)
      }

      console.log('localStorage cleared (authentication data preserved)')

      // Note: We intentionally do not clear the origin private file system
      // as it may contain important user data that should persist across updates

      return Promise.resolve()
    } catch (error) {
      console.error('Error clearing application data:', error)
      return Promise.resolve()
    }
  }

  /**
   * Activate the available update
   */
  public activateUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled || !this.updateAvailable()) {
      return Promise.resolve(false)
    }

    return this.swUpdate
      .activateUpdate()
      .then(async () => {
        console.log('Update activated')
        this.updateAvailable.set(false)

        // Clear all data before reloading
        console.log('Clearing all data before applying update')
        await this.clearAllData()

        // Update the stored version to the current version
        localStorage.setItem('app_version', this.currentVersion)

        // Reload the page to apply the update
        document.location.reload()
        return true
      })
      .catch((err) => {
        console.error('Error activating update:', err)
        return false
      })
  }
}
