import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root' // Singleton service
})
export class ViewStateService {
  // Signal for the current view (explore or search)
  public currentView: WritableSignal<'explore' | 'search'> = signal('explore');

  // Signal for the search mode (network or local)
  public searchMode: WritableSignal<'network' | 'local'> = signal('network');

  constructor() {
    console.log('ViewStateService: Initialized');
  }

  /**
   * Sets the current view
   * @param view The view to set ('explore' or 'search')
   */
  setCurrentView(view: 'explore' | 'search'): void {
    console.log(`ViewStateService: Setting current view to ${view}`);
    this.currentView.set(view);
  }

  /**
   * Sets the search mode
   * @param mode The search mode to set ('network' or 'local')
   */
  setSearchMode(mode: 'network' | 'local'): void {
    console.log(`ViewStateService: Setting search mode to ${mode}`);
    this.searchMode.set(mode);
  }
}
