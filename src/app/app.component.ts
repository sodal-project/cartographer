import { Component, signal, WritableSignal, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ProfileService } from './services/profile.service'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent {
  public title: WritableSignal<string> = signal('explore')

  // Inject ProfileService to ensure it's loaded on app startup
  private profileService = inject(ProfileService)
}
