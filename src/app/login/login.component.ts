import {Component, inject} from '@angular/core'
import {CommonModule} from '@angular/common'
import {AuthService} from '../auth.service'
import {Router} from '@angular/router'
import {take} from 'rxjs/operators'
import {MatButton} from '@angular/material/button'
import {MatIconModule, MatIconRegistry} from '@angular/material/icon'
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader, MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card'
import {MatIcon} from '@angular/material/icon'
import {DomSanitizer} from '@angular/platform-browser'
import {version} from '../../../package.json'

@Component({
  selector: 'login',
  standalone: true,
  imports: [
    CommonModule,
    MatButton,
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatCardHeader,
    MatCardActions,
    MatIconModule
  ], // Add CommonModule for async pipe, ngIf, etc.
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.sass']
})
export class LoginComponent {
  private matIconRegistry = inject(MatIconRegistry);
  private domSanitizer = inject(DomSanitizer);
  public authService = inject(AuthService);
  private router = inject(Router);
  public version = version

  constructor() {
    this.matIconRegistry.addSvgIcon(
      'google-logo',
      this.domSanitizer.bypassSecurityTrustResourceUrl('icons/google.svg')
    )

    this.matIconRegistry.addSvgIcon(
      'github-logo',
      this.domSanitizer.bypassSecurityTrustResourceUrl('icons/github.svg')
    )
  }

  ngOnInit(): void {
    this.authService.user$.pipe(take(1)).subscribe(async user => {
      if (user) {
        await this.router.navigate(['/dashboard'])
      }
    })
  }

  async loginWithGoogle(): Promise<void> {
    await this.authService.googleSignIn()
    window.location.reload()
  }

  async loginWithGitHub(): Promise<void> {
    await this.authService.githubSignIn()
    window.location.reload()
  }
}
