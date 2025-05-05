import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core'
import { provideRouter, Routes } from '@angular/router'

import {
  provideClientHydration,
  withEventReplay
} from '@angular/platform-browser'
import { initializeApp, provideFirebaseApp } from '@angular/fire/app'
import { getAuth, provideAuth } from '@angular/fire/auth'
import { getFirestore, provideFirestore } from '@angular/fire/firestore'
import { getFunctions, provideFunctions } from '@angular/fire/functions'
import { getMessaging, provideMessaging } from '@angular/fire/messaging'
import { getStorage, provideStorage } from '@angular/fire/storage'
import { getVertexAI, provideVertexAI } from '@angular/fire/vertexai'
import { environment } from '../environments/environment'
import { DashboardComponent } from './dashboard/dashboard.component';
import { provideServiceWorker } from '@angular/service-worker'

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }, // Redirect to dashboard
  { path: 'dashboard', component: DashboardComponent } // The dashboard route
]

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(withEventReplay()),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage()),
    provideVertexAI(() => getVertexAI()), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
}
