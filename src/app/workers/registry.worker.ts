import { Service } from '../models/service.model'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCZCUuI2DzlWwwDOuRzzIpQiJ_4jSg7RrA',
  authDomain: 'cartographer-a03db.firebaseapp.com',
  projectId: 'cartographer-a03db',
  storageBucket: 'cartographer-a03db.firebasestorage.app',
  messagingSenderId: '507004338227',
  appId: '1:507004338227:web:5043e93b116671f24f6346'
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const firestore = getFirestore(app)

interface WorkerCommand {
  command: 'getServices'
}

type WorkerResponse =
  | { status: 'success'; data: Service[] }
  | { status: 'error'; error: string }

// Listen for messages from the main thread
addEventListener('message', async ({ data }: MessageEvent<WorkerCommand>) => {
  console.log('Worker: Message received from main script:', data)

  const { command } = data

  if (command === 'getServices') {
    console.log(
      'Worker: Fetching services from Firestore _services collection...'
    )
    try {
      const servicesCollection = collection(firestore, '_services')
      const querySnapshot = await getDocs(servicesCollection)

      if (querySnapshot.empty) {
        console.warn('Worker: No services found in _services collection')
        postMessage({
          status: 'success',
          data: []
        } satisfies WorkerResponse)
        return
      }

      const services: Service[] = []
      querySnapshot.forEach((doc) => {
        const serviceData = doc.data() as Service
        serviceData.id = doc.id // Ensure the id is set from the document id
        services.push(serviceData)
      })

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
