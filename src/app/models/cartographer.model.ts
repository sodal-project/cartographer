export interface GraphNode {
  _graph_node: {
    embedding?: number[] // Vector embedding for the node content
  }
  id: string // Unique identifier for the node
  createdBy: {
    module: string
    version: string
    model: string
    modelVersion: string
  }
  noun: Nouns
  createdAt: Timestamp // Timestamp of node creation
  updatedAt: Timestamp // Timestamp of the last update
  data?: { [key: string]: any } // Flexible data associated with the node
  embedding?: number[] // Vector embedding for the node content
}

export interface GraphEdge {
  _graph_node: {
    embedding?: number[] // Vector embedding for the node content
  }
  id: string // Unique identifier for the edge
  source: string // ID of the source node
  target: string // ID of the target node
  label?: string // Optional label describing the relationship
  verb: EdgeVerbs
  createdAt: Timestamp // Timestamp of edge creation
  updatedAt: Timestamp // Timestamp of the last update
  data?: { [key: string]: any } // Flexible data associated with the edge
  embedding?: number[] // Vector embedding for the edge relationship
  confidence?: number // Confidence score as a probability (0-1)
  weight?: number // Influence or weight score indicating the strength of the relationship
}

/**
 * EmbeddedGraphEdge is a version of GraphEdge that can be embedded directly in a parent document
 * in a subcollection, reducing the need to create separate GraphEdge documents.
 * The parent document is implicitly the source of the edge.
 */
export type EmbeddedGraphEdge = Omit<GraphEdge, 'source'>

// Proper Nouns (as first-class citizens in the data model)
export interface Profile extends GraphNode {
  noun: 'person'
}

export interface Content extends GraphNode {
  noun: 'content'
}

export interface Action extends GraphNode {
  noun: 'action'
}

// End Proper Nouns

export const Nouns = {
  Person: 'person',
  Content: 'content',
  Action: 'action',
  URI: 'uri'
} as const

export type Nouns = (typeof Nouns)[keyof typeof Nouns]

export const EdgeVerbs = {
  AttributedTo: 'attributedTo',
  Controls: 'controls',
  Created: 'created',
  Earned: 'earned',
  Owns: 'owns'
} as const

export type EdgeVerbs = (typeof EdgeVerbs)[keyof typeof EdgeVerbs]

export interface Timestamp {
  seconds: number
  nanoseconds: number
}

// Supported model types with more specific categorization
export const ModelType = {
  TextEmbedding: 'text-embedding',
  TextGeneration: 'text-generation',
  ImageEmbedding: 'image-embedding',
  ImageGeneration: 'image-generation',
  MultiModal: 'multi-modal'
} as const

export type ModelType = (typeof ModelType)[keyof typeof ModelType]

// Supported embedding dimensions and datatypes
export interface EmbeddingConfig {
  dimensions: number
  dataType: 'float32' | 'float64' | 'int8'
  contextWindow?: number
  maxTokens?: number
}

// Model provider/vendor information
export interface ModelProvider {
  name: string
  apiVersion: string
  homepage?: string
}

// Enhanced ServiceModel interface
export interface ServiceModel {
  // Basic service information
  service: string
  serviceVersion: `${number}.${number}.${number}`

  // Model details
  model: string
  modelVersion: string
  modelType: ModelType

  // Embedding specific configuration
  embeddingConfig?: EmbeddingConfig

  // Provider information
  provider: ModelProvider

  // Additional metadata
  description?: string
  maxBatchSize?: number
  supportedMimeTypes?: string[]

  // Web worker embedding function
  webWorkerEmbeddingEndpoint?: string

  // Performance characteristics
  averageLatency?: number // in milliseconds
  maxConcurrentRequests?: number

  // Deployment info
  deployedAt?: Date
  lastUpdated?: Date
}
