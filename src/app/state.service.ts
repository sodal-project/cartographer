import { Injectable, signal } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class StateService {
  public onlineStatus = signal<boolean>(true) // Initial value of state

  constructor() {}

  setOnlineStatus(status: boolean) {
    this.onlineStatus.set(status)
  }
}
