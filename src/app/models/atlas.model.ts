import { Timestamp } from 'firebase/firestore'

export interface GraphNode {
  id: string // Unique identifier for the node
  createdAt: Timestamp // Timestamp of node creation
  updatedAt: Timestamp // Timestamp of the last update
  data: { [key: string]: any } // Flexible data associated with the node
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
  Person = 'person',
  Content = 'content',
  Action = 'action'
}

export enum EdgeVerbs {
  AttributedTo = 'attributedTo',
  Controls = 'controls',
  Created = 'created',
  Earned = 'earned',
  Owns = 'owns'
}
