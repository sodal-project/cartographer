import { Service } from '../models/service.model'

interface WorkerCommand {
  command: 'getServices'
  registryUrl: string
}

type WorkerResponse =
  | { status: 'success'; data: Service[] }
  | { status: 'error'; error: string }

// Listen for messages from the main thread
addEventListener('message', async ({ data }: MessageEvent<WorkerCommand>) => {
  console.log('Worker: Message received from main script:', data)

  const { command, registryUrl } = data

  if (command === 'getServices') {
    if (!registryUrl) {
      postMessage({
        status: 'error',
        error: 'Registry URL not provided.'
      } satisfies WorkerResponse)
      return
    }

    console.log(`Worker: Fetching services from ${registryUrl}...`)
    try {
      const response = await fetch(registryUrl)

      if (!response.ok) {
        throw new Error(
          `HTTP error! Status: ${response.status} ${response.statusText}`
        )
      }

      const services: Service[] = await response.json()
      console.log('Worker: Successfully fetched services:', services)

      postMessage({
        status: 'success',
        data: services
      } satisfies WorkerResponse)
    } catch (error: unknown) {
      console.error('Worker: Error fetching services:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch services'
      // Send the error back to the main thread
      postMessage({
        status: 'error',
        error: errorMessage
      } satisfies WorkerResponse)
    }
  } else {
    const unknownCommand = (data as any)?.command ?? 'unknown'
    console.warn('Worker: Unknown command received:', unknownCommand)
    postMessage({
      status: 'error',
      error: `Unknown command: ${unknownCommand}`
    } satisfies WorkerResponse)
  }
})

addEventListener('error', (errorEvent: ErrorEvent) => {
  console.error('Worker: Uncaught error:', errorEvent.message, errorEvent)
})

console.log('Worker: Initialized and ready for messages.')

export {}
