import {
  Component,
  inject,
  signal,
  WritableSignal,
  ChangeDetectionStrategy
} from '@angular/core'
import {
  Firestore,
  disableNetwork,
  enableNetwork,
  collection,
  getDocs,
  doc,
  getDoc
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
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router'
import { version } from '../../../package.json'
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu'
import { MatExpansionModule } from '@angular/material/expansion'
import { Service } from '../models/service.model'

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
export class DashboardComponent {
  private registryService = inject(RegistryService)
  protected readonly authService = inject(AuthService)
  private readonly router = inject(Router)
  private readonly firestore = inject(Firestore)
  protected readonly updateService = inject(UpdateService)
  public showSideMenu: WritableSignal<boolean> = signal(true)
  public onlineStatus: WritableSignal<boolean> = signal(navigator.onLine)
  public readonly updateAvailable = this.updateService.updateAvailable
  public version = version
  private servicesCache: Service[] | null = null

  constructor() {
    window.addEventListener('online', () => this.onlineStatus.set(true))
    window.addEventListener('offline', () => this.onlineStatus.set(false))
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
   * Fetches the services list from Firestore _services collection
   * @returns An array of Service objects
   */
  staticServices(): Service[] {
    if (this.servicesCache) {
      return this.servicesCache
    }

    // Create an empty array to return while we're fetching the data
    const emptyServices: Service[] = []

    // Fetch the services list from Firestore _services collection
    const servicesCollection = collection(this.firestore, '_services')
    getDocs(servicesCollection)
      .then((querySnapshot) => {
        if (!querySnapshot.empty) {
          const services: Service[] = []
          querySnapshot.forEach((doc) => {
            const serviceData = doc.data() as Service
            serviceData.id = doc.id // Ensure the id is set from the document id
            services.push(serviceData)
          })
          this.servicesCache = services
        } else {
          console.error('No services found in _services collection')
        }
      })
      .catch((error) => {
        console.error('Error fetching services:', error)
      })

    return emptyServices
  }

  /**
   * Activates the available update or checks for updates if none are available
   */
  activateUpdate(): void {
    if (this.updateAvailable()) {
      // If an update is available, activate it
      this.updateService.activateUpdate().then((success) => {
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
