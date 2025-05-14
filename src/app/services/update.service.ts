import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  private swUpdate = inject(SwUpdate);

  // Signal to track if an update is available
  public updateAvailable: WritableSignal<boolean> = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      // Initial check for updates
      this.checkForUpdate();

      // Subscribe to version updates
      this.swUpdate.versionUpdates.subscribe(() => {
        console.log('Update available');
        this.updateAvailable.set(true);
      });
    }
  }

  /**
   * Check for available updates
   */
  public checkForUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate()
        .then(() => console.log('Checked for updates'))
        .catch(err => console.error('Error checking for updates:', err));
    }
  }

  /**
   * Activate the available update
   */
  public activateUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled || !this.updateAvailable()) {
      return Promise.resolve(false);
    }

    return this.swUpdate.activateUpdate()
      .then(() => {
        console.log('Update activated');
        this.updateAvailable.set(false);
        // Reload the page to apply the update
        document.location.reload();
        return true;
      })
      .catch(err => {
        console.error('Error activating update:', err);
        return false;
      });
  }
}
