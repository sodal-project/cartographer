export interface GraphNode {
  id: string // Unique identifier for the node
  createdBy: {
    module: string
    version: string
    model: string
    modelVersion: string
  }
  createdAt: Timestamp // Timestamp of node creation
  updatedAt: Timestamp // Timestamp of the last update
  data?: { [key: string]: any } // Flexible data associated with the node
  embedding?: number[] // Vector embedding for the node content
}

export interface GraphEdge {
  id: string // Unique identifier for the edge
  source: string // ID of the source node
  target: string // ID of the target node
  label?: string // Optional label describing the relationship
  verb: EdgeVerbs
  createdAt: Timestamp // Timestamp of edge creation
  updatedAt: Timestamp // Timestamp of the last update
  data?: { [key: string]: any } // Flexible data associated with the edge
  embedding?: number[] // Vector embedding for the edge relationship
}

export enum Nouns {
  Person = "person",
  Content = "content",
  Action = "action",
  URI = "uri"
}

export enum EdgeVerbs {
  AttributedTo = "attributedTo",
  Controls = "controls",
  Created = "created",
  Earned = "earned",
  Owns = "owns"
}

interface CreationMetadata {
  module: string
  version: string
  model: string
  modelVersion: string
}

export type DocRef<T> = {
  path: string
  id: string
  collection: string
}

export interface Timestamp {
  seconds: number
  nanoseconds: number
}

// Supported model types with more specific categorization
export enum ModelType {
  TextEmbedding = "text-embedding",
  TextGeneration = "text-generation",
  ImageEmbedding = "image-embedding",
  ImageGeneration = "image-generation",
  MultiModal = "multi-modal"
}

// Supported embedding dimensions and datatypes
export interface EmbeddingConfig {
  dimensions: number
  dataType: "float32" | "float64" | "int8"
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
