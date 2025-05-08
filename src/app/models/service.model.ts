export interface Timestamp {
  seconds: number
  nanoseconds: number
}

export interface Service {
  id: string
  name: string
  version: string
  url: string
}

export interface ServiceAPI {
  services: Service[]
  error?: string
  isLoading: boolean
  fetchServices: (registryUrl: string) => void
}
