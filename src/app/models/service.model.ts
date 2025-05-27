export interface Endpoint {
  path: string
  method: string
  description: string
}

export interface Authentication {
  type: string
  description: string
}

export interface Service {
  disabled: boolean
  id: string
  name: string
  version: string
  url: string
  description?: string
  endpoints?: Endpoint[]
  authentication?: Authentication
  lastUpdated?: string
}
