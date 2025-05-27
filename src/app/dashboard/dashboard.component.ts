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
import { BrainyService } from '../services/brainy.service'
import { CommonModule } from '@angular/common'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import {
  MatListModule,
  MatSelectionList,
  MatListOption
} from '@angular/material/list'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
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
    MatSelectionList,
    MatListOption,
    MatTooltipModule,
    MatProgressSpinnerModule,
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
  private readonly brainyService = inject(BrainyService)
  public showSideMenu: WritableSignal<boolean> = signal(true)
  public onlineStatus: WritableSignal<boolean> = signal(navigator.onLine)
  public readonly updateAvailable = this.updateService.updateAvailable
  public version = version
  public services: WritableSignal<Service[]> = signal([])
  public isLoadingServices: WritableSignal<boolean> = signal(false)
  public selectedServices: WritableSignal<string[]> = signal([])

  constructor() {
    window.addEventListener('online', () => this.onlineStatus.set(true))
    window.addEventListener('offline', () => this.onlineStatus.set(false))

    // Fetch services when component is initialized
    this.fetchServices()
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
   * Fetches the services list from Firestore _services collection,
   * stores it locally using Brainy, and updates the services signal
   */
  async fetchServices(): Promise<void> {
    // Set loading state to true
    this.isLoadingServices.set(true)

    try {
      // First, try to get services from local Brainy storage
      const localServices = await this.brainyService.getNodes()

      // Filter only services (assuming they have a specific property or type)
      const services = localServices.filter(
        (node) =>
          node.noun?.toString().toLowerCase() === 'service' ||
          (node.data && node.data['type'] === 'service')
      ) as unknown as Service[]

      if (services.length > 0) {
        // If we have services in local storage, use them
        this.services.set(services)
        this.isLoadingServices.set(false)
      }

      // Regardless of whether we found local services, fetch from Firestore to get updates
      // This ensures we always have the latest data
      const servicesCollection = collection(this.firestore, '_services')
      const querySnapshot = await getDocs(servicesCollection)

      if (!querySnapshot.empty) {
        const freshServices: Service[] = []
        // Using Promise.all to handle async operations in parallel
        await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const serviceData = doc.data() as Service
            serviceData.id = doc.id // Ensure the id is set from the document id
            freshServices.push(serviceData)

            // Store each service in Brainy
            await this.brainyService.storeNode({
              ...serviceData,
              noun: 'service', // Ensure we can identify it as a service
              id: doc.id
            })
          })
        )

        // Update the services signal with the fetched data
        this.services.set(freshServices)
      } else if (services.length === 0) {
        // Only log error if we also didn't find local services
        console.error('No services found in _services collection')
        this.services.set([])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      this.services.set([])
    } finally {
      // Set loading state to false
      this.isLoadingServices.set(false)
    }
  }

  /**
   * Returns the current value of the services signal
   * @returns An array of Service objects
   */
  staticServices(): Service[] {
    return this.services()
  }

  /**
   * Refreshes the services list from Firestore
   */
  refreshServices(): void {
    this.fetchServices()
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

  /**
   * Handles selection changes in the services list
   * @param event The selection change event
   */
  onServiceSelectionChange(event: any): void {
    const selectedOptions = event.source.selectedOptions.selected
    const selectedServiceIds = selectedOptions.map(
      (option: any) => option.value
    )
    this.selectedServices.set(selectedServiceIds)
    console.log('Selected services:', selectedServiceIds)
  }
}
