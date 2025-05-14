import {
  Component,
  inject,
  // OnInit, // Removed unused import
  signal,
  WritableSignal
} from '@angular/core'
import { /* Router, */ RouterOutlet } from '@angular/router' // Commented out unused Router import
// import { AuthService } from './auth.service' // Commented out unused import
// import { AsyncPipe } from '@angular/common' // Removed unused import
import { UpdateService } from './services/update.service'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent { // Removed OnInit implementation
  public title: WritableSignal<string> = signal('atlas')
  private updateService = inject(UpdateService)
  // private authService = inject(AuthService) // Commented out unused service
  // private router = inject(Router) // Commented out unused router

  constructor() {
    // No automatic update activation
  }

  // Commented out empty method
  // ngOnInit() {
  //   // UpdateService will handle checking for updates
  // }
}
