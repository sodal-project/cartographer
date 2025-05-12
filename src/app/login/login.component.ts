import {Component, inject, OnInit, effect} from '@angular/core'
import {CommonModule} from '@angular/common'
import {AuthService} from '../auth.service'
import {Router} from '@angular/router'
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
export class LoginComponent implements OnInit {
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

    // Set up an effect to navigate to dashboard when user is authenticated
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.router.navigate(['/dashboard']).catch(err =>
          console.error('Navigation error:', err)
        );
      }
    });
  }

  ngOnInit(): void {
    // Initial check is now handled by the effect
  }

  async loginWithGoogle(): Promise<void> {
    await this.authService.googleSignIn()
    // No need to reload - the effect will handle navigation when the user signal changes
  }

  async loginWithGitHub(): Promise<void> {
    await this.authService.githubSignIn()
    // No need to reload - the effect will handle navigation when the user signal changes
  }
}
