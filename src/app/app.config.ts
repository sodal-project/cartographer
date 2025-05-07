import {
  ApplicationConfig,
  provideZoneChangeDetection,
  isDevMode
} from '@angular/core'
import {provideRouter, Routes, withHashLocation} from '@angular/router'
import {
  provideClientHydration,
  withEventReplay
} from '@angular/platform-browser'
import {initializeApp, provideFirebaseApp} from '@angular/fire/app'
import {getAuth, provideAuth} from '@angular/fire/auth'
import {getFirestore, provideFirestore} from '@angular/fire/firestore'
import {getFunctions, provideFunctions} from '@angular/fire/functions'
import {getMessaging, provideMessaging} from '@angular/fire/messaging'
import {getStorage, provideStorage} from '@angular/fire/storage'
import {getVertexAI, provideVertexAI} from '@angular/fire/vertexai'
import {environment} from '../environments/environment'
import {DashboardComponent} from './dashboard/dashboard.component'
import {provideServiceWorker} from '@angular/service-worker'
import {importProvidersFrom} from '@angular/core'
import {LoginComponent} from './login/login.component'
import {authGuard} from './auth.guard'
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http'


export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent // Or loadComponent for lazy loading
  },
  {
    path: 'dashboard',
    component: DashboardComponent, // Or loadComponent
    canActivate: [authGuard]
  },
  {
    path: '', // Default route
    component: DashboardComponent, // Or loadComponent
  },
  {path: '**', redirectTo: '/login'} // Redirect non-matching routes to login
]

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideClientHydration(withEventReplay()),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage()),
    provideVertexAI(() => getVertexAI()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideHttpClient(withInterceptorsFromDi())
  ]
}
