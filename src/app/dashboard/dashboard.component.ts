import {
  Component,
  OnInit,
  inject,
  signal,
  WritableSignal,
  ChangeDetectionStrategy,
  EnvironmentInjector
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
import { Service } from '../models/service.model'
import { MatProgressSpinner } from '@angular/material/progress-spinner'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router'
import { version } from '../../../package.json'
import { Cartographer } from '../cartographer/cartographer'
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu'

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
    MatProgressSpinner,
    ReactiveFormsModule,
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger
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
  private readonly environmentInjector = inject(EnvironmentInjector)
  public readonly services = this.registryService.services
  public readonly error = this.registryService.error
  public readonly isLoading = this.registryService.isLoading
  public showSideMenu: WritableSignal<boolean> = signal(true)
  public onlineStatus: WritableSignal<boolean> = signal(navigator.onLine)
  public version = version

  // --- Configuration ---
  // This URL will point to a hosted Registry Server in production
  private readonly REGISTRY_SERVICE_URL = './services.json'
  private _formBuilder = inject<FormBuilder>(FormBuilder)

  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required]
  })
  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required]
  })
  isLinear = false

  constructor() {
    window.addEventListener('online', () => this.onlineStatus.set(true))
    window.addEventListener('offline', () => this.onlineStatus.set(false))
  }

  ngOnInit(): void {
    this.fetchServiceList()
  }

  fetchServiceList(): void {
    console.log('DashboardComponent: Requesting service list fetch.')
    this.registryService.fetchServices(this.REGISTRY_SERVICE_URL)
  }

  toggleSideMenu(): void {
    this.showSideMenu.update((value) => !value)
  }

  async toggleOnlineStatus(): Promise<void> {
    this.onlineStatus.update((value) => !value)

    // Wrap Firebase calls in runInContext
    await this.environmentInjector.runInContext(async () => {
      if (!this.onlineStatus()) {
        await disableNetwork(this.firestore)
      } else {
        await enableNetwork(this.firestore)
      }
    })
  }

  trackServiceById(index: number, service: Service): string {
    return service.id
  }

  async logout(): Promise<void> {
    await this.authService.logout()
    await this.router.navigate(['/login'])
  }
}
