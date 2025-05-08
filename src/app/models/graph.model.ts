import {Timestamp} from './service.model';

export interface GraphNode {
  id: string // Unique identifier for the node
  group?: number // Optional group for styling
  createdAt?: Timestamp // Timestamp of node creation
  updatedAt?: Timestamp // Timestamp of the last update
  data?: { [key: string]: any } // Flexible data associated with the node
}

export interface GraphNodeIndex {
  id: string // Unique identifier for the node
  text: string // Text content to be indexed for full-text search
  createdAt: Timestamp // Timestamp of node creation
  updatedAt: Timestamp // Timestamp of the last update
}

export interface GraphEdge {
  id: string // Unique identifier for the edge
  source: string // ID of the source node
  target: string // ID of the target node
  label?: string // Optional label describing the relationship
  verb?: EdgeVerbs
  createdAt?: Timestamp // Timestamp of edge creation
  updatedAt?: Timestamp // Timestamp of the last update
  data?: { [key: string]: any } // Flexible data associated with the edge
}

export enum EdgeVerbs {
  AttributedTo = 'attributedTo',
  Controls = 'controls',
  Created = 'created',
  Earned = 'earned',
  Owns = 'owns'
}
