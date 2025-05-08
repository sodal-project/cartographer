import {
  Component,
  OnInit,
  inject,
  signal,
  WritableSignal,
  ChangeDetectionStrategy
} from '@angular/core'
import {AuthService} from '../auth.service'
import {CommonModule} from '@angular/common'
import {MatToolbarModule} from '@angular/material/toolbar'
import {MatButtonModule} from '@angular/material/button'
import {MatIconModule} from '@angular/material/icon'
import {MatSidenavModule} from '@angular/material/sidenav'
import {MatListModule} from '@angular/material/list'
import {MatTooltipModule} from '@angular/material/tooltip'
import {RegistryService} from '../services/registry.service'
import {Service} from '../models/service.model'
import {MatProgressSpinner} from '@angular/material/progress-spinner'
import {
  MatCard,
  MatCardContent,
  MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card'
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms'
import {Router} from '@angular/router'
import {version} from '../../../package.json'
import {GraphComponent} from '../graph/graph.component';

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
    MatCard,
    MatCardTitle,
    MatCardContent,
    ReactiveFormsModule,
    GraphComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private registryService = inject(RegistryService)
  protected readonly authService = inject(AuthService)
  private readonly router = inject(Router)
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

  toggleOnlineStatus(): void {
    this.onlineStatus.update((value) => !value)
    console.warn('Toggling online status for UI demo only.')
  }

  trackServiceById(index: number, service: Service): string {
    return service.id
  }

  async logout(): Promise<void> {
    await this.authService.logout()
    await this.router.navigate(['/login']) // Redirect to login after logout
  }
}
