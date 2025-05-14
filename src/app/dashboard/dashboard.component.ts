import {
  Component,
  OnInit,
  inject,
  signal,
  WritableSignal,
  ChangeDetectionStrategy
} from '@angular/core'
import {
  Firestore,
  disableNetwork,
  enableNetwork
} from '@angular/fire/firestore'
import { AuthService } from '../auth.service'
import { CommonModule } from '@angular/common'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
import { MatTooltipModule } from '@angular/material/tooltip'
import { RegistryService } from '../services/registry.service'
import { UpdateService } from '../services/update.service'
import { STATIC_SERVICES } from '../models/static-services'
// Commented out unused imports
// import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router'
import { version } from '../../../package.json'
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu'
import { MatExpansionModule } from '@angular/material/expansion'

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule,
    // ReactiveFormsModule, // Commented out unused import
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatExpansionModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private registryService = inject(RegistryService)
  protected readonly authService = inject(AuthService)
  private readonly router = inject(Router)
  private readonly firestore = inject(Firestore)
  protected readonly updateService = inject(UpdateService)
  public readonly services = this.registryService.services
  public readonly error = this.registryService.error
  public readonly isLoading = this.registryService.isLoading
  public showSideMenu: WritableSignal<boolean> = signal(true)
  public onlineStatus: WritableSignal<boolean> = signal(navigator.onLine)
  public readonly updateAvailable = this.updateService.updateAvailable
  public version = version
  public staticServices = STATIC_SERVICES

  // --- Configuration ---
  // URL for the service model endpoint
  private readonly REGISTRY_SERVICE_URL = '/service-model'
  // private _formBuilder = inject<FormBuilder>(FormBuilder) // Commented out unused injection

  // Commented out unused form groups
  // firstFormGroup = this._formBuilder.group({
  //   firstCtrl: ['', Validators.required]
  // })
  // secondFormGroup = this._formBuilder.group({
  //   secondCtrl: ['', Validators.required]
  // })
  // isLinear = false

  constructor() {
    window.addEventListener('online', () => this.onlineStatus.set(true))
    window.addEventListener('offline', () => this.onlineStatus.set(false))
  }

  ngOnInit(): void {
    // Using static services instead of fetching from an endpoint
    console.log('DashboardComponent: Using static services.')
  }

  toggleSideMenu(): void {
    this.showSideMenu.update((value) => !value)
  }

  async toggleOnlineStatus(): Promise<void> {
    this.onlineStatus.update((value) => !value)

    if (!this.onlineStatus()) {
      await disableNetwork(this.firestore)
    } else {
      await enableNetwork(this.firestore)
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout()
    // Ensure we navigate to the login page after logout
    // Use a small timeout to ensure the auth state has been updated
    setTimeout(() => {
      this.router.navigate(['/login'])
    }, 100)
  }

  /**
   * Activates the available update or checks for updates if none are available
   */
  activateUpdate(): void {
    if (this.updateAvailable()) {
      // If an update is available, activate it
      this.updateService.activateUpdate()
        .then(success => {
          if (!success) {
            console.error('Failed to activate update')
          }
        })
    } else {
      // If no update is available, check for updates
      this.updateService.checkForUpdate()
    }
  }
}
