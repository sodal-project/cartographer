import { Service } from './service.model'

/**
 * Static list of services available in the atlas-registry
 */
export const STATIC_SERVICES: Service[] = [
  {
    id: 'bluesky-service',
    disabled: false,
    name: 'Bluesky Service',
    version: '1.0.0',
    url: 'http://localhost:8081/bluesky',
    description: 'Service for interacting with the Bluesky social network',
    endpoints: [
      {
        path: '/search',
        method: 'GET',
        description: 'Search'
      }
    ]
  },
  {
    id: 'github-service',
    disabled: true,
    name: 'Github Service',
    version: '2.0.1',
    url: 'http://localhost:8082/users',
    description: 'Manage user profiles and preferences',
    endpoints: [
      {
        path: '/search',
        method: 'GET',
        description: 'Search'
      }
    ]
  },
  {
    id: 'linkedin-service',
    disabled: true,
    name: 'LinkedIn Service',
    version: '1.5.5',
    url: 'http://localhost:8083/products',
    description: 'Browse and search product catalog',
    endpoints: [
      {
        path: '/search',
        method: 'GET',
        description: 'Search'
      }
    ]
  },
  {
    id: 'validation-service',
    disabled: true,
    name: 'Human Verification Service',
    version: '3.1.0',
    url: 'http://localhost:8084/orders',
    description: 'Manage customer orders',
    endpoints: [
      {
        path: '/search',
        method: 'GET',
        description: 'Search'
      }
    ]
  }
]
