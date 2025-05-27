import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core'
import { Service } from '../models/service.model'

type WorkerResponse =
  | { status: 'success'; data: Service[] }
  | { status: 'error'; error: string }

@Injectable({
  providedIn: 'root' // Singleton service
})
export class RegistryService implements OnDestroy {
  private worker?: Worker

  // --- State Signals ---
  public readonly services: WritableSignal<Service[] | null> = signal(null)
  public readonly error: WritableSignal<string | null> = signal(null)
  public readonly isLoading: WritableSignal<boolean> = signal(false)

  constructor() {
    this.initializeWorker()
  }

  private initializeWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./../workers/registry.worker', import.meta.url),
          {
            type: 'module'
          }
        )

        console.log('RegistryService: Worker initialized.')

        // --- Listen for messages from the worker ---
        this.worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
          console.log('RegistryService: Message received from worker:', data)
          this.isLoading.set(false)

          if (data.status === 'success') {
            this.services.set(data.data)
            this.error.set(null)
          } else if (data.status === 'error') {
            this.services.set(null)
            this.error.set(data.error)
          } else {
            const unknownStatus = (data as any)?.status ?? 'unknown'
            console.error(
              `RegistryService: Received unknown status from worker: ${unknownStatus}`
            )
            this.error.set(`Unknown worker message status: ${unknownStatus}`)
            this.services.set(null)
          }
        }

        this.worker.onerror = (error: ErrorEvent) => {
          console.error(
            'RegistryService: Error originating from worker:',
            error
          )
          this.isLoading.set(false)
          this.services.set(null)
          this.error.set(`Worker error: ${error.message} (check console)`)
        }
      } catch (e) {
        console.error('RegistryService: Failed to create Web Worker.', e)
        this.error.set(
          'Failed to create Web Worker. Browser might not support it or script path is wrong.'
        )
        this.worker = undefined
      }
    } else {
      console.error(
        'RegistryService: Web Workers are not supported in this browser.'
      )
      this.error.set('Web Workers are not supported in this browser.')
      this.worker = undefined
    }
  }

  /**
   * Tells the worker to fetch the list of services from Firestore.
   */
  fetchServices(): void {
    if (!this.worker) {
      this.error.set('Cannot fetch services: Worker is not available.')
      console.warn(
        'RegistryService: fetchServices called but worker is not available.'
      )
      return
    }

    this.isLoading.set(true)
    this.error.set(null)
    this.services.set(null)

    console.log(
      'RegistryService: Sending getServices command to worker to fetch from Firestore'
    )

    this.worker.postMessage({
      command: 'getServices'
    })
  }

  ngOnDestroy(): void {
    if (this.worker) {
      console.log('RegistryService: Terminating worker.')
      this.worker.terminate()
      this.worker = undefined
    }
  }
}
