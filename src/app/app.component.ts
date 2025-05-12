import {
  Component,
  inject,
  OnInit,
  signal,
  WritableSignal,
  effect
} from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { AuthService } from './auth.service'
import { AsyncPipe } from '@angular/common'
import { SwUpdate } from '@angular/service-worker'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit {
  public title: WritableSignal<string> = signal('atlas')
  private swUpdate = inject(SwUpdate)
  private authService = inject(AuthService)
  private router = inject(Router)

  // Signal to track if an update is available
  private updateAvailable: WritableSignal<boolean> = signal(false)

  constructor() {
    // Set up an effect to activate updates when available
    effect(() => {
      if (this.updateAvailable()) {
        this.swUpdate.activateUpdate().then(() => {
          console.log('app activated')
        })
      }
    })
  }

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate().then(() => {
        // Use a single subscription to handle updates
        this.swUpdate.versionUpdates.subscribe(() => {
          console.log('app updated')
          this.updateAvailable.set(true)
        })
      })
    }
  }
}
