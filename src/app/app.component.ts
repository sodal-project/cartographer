import { Component } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { AuthService } from './auth.service'
import { AsyncPipe } from '@angular/common'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent {
  title = 'atlas'

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}
}
