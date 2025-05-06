import {
  Component,
  OnInit,
  inject,
  signal,
  WritableSignal,
  ChangeDetectionStrategy
} from '@angular/core'
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
import {
  MatCard,
  MatCardContent,
  MatCardSubtitle,
  MatCardTitle
} from '@angular/material/card'
import {
  MatStep,
  MatStepLabel,
  MatStepper,
  MatStepperNext,
  MatStepperPrevious
} from '@angular/material/stepper'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatFormField, MatInput, MatLabel } from '@angular/material/input'

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
    MatStep,
    ReactiveFormsModule,
    MatStepLabel,
    MatFormField,
    MatLabel,
    MatStepperPrevious,
    MatStepperNext,
    MatInput,
    MatStepper
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private registryService = inject(RegistryService)
  public readonly services = this.registryService.services
  public readonly error = this.registryService.error
  public readonly isLoading = this.registryService.isLoading

  // --- Component State ---
  public showSideMenu: WritableSignal<boolean> = signal(true)
  public onlineStatus: WritableSignal<boolean> = signal(navigator.onLine)

  // --- Configuration ---
  // This URL will point to a hosted Registry Server in production
  private readonly REGISTRY_SERVICE_URL = './services.json'

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

  private _formBuilder = inject<FormBuilder>(FormBuilder)

  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required]
  })
  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required]
  })
  isLinear = false
}
