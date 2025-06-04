// Force Simulation Web Worker
// This worker offloads the D3 force simulation computation from the main thread

import * as d3 from 'd3';

// Define interfaces for the data structures
interface GraphNode {
  id: string;
  group: number;
  noun?: string;
  x?: number;
  y?: number;
}

interface CustomNode extends GraphNode {
  // Only include essential data for rendering
  essentialData: {
    displayName: string;
    handle: string;
    avatar: string;
  }
}

interface Edge {
  source: string | CustomNode;
  target: string | CustomNode;
  verb?: string;
  confidence?: number;
}

// Listen for messages from the main thread
addEventListener('message', (event) => {
  const { nodes, edges, width, height, nodeSize } = event.data;

  // Create a new simulation
  const simulation = d3
    .forceSimulation<CustomNode>(nodes)
    .force(
      'link',
      d3
        .forceLink<CustomNode, Edge>(edges)
        .id((d) => d.id)
        .distance(350)
        .strength(0.2)
    )
    .force('charge', d3.forceManyBody().strength(-1500))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force(
      'collision',
      d3
        .forceCollide()
        .radius(Math.max(nodeSize.width, nodeSize.height) / 2 + 40)
    );

  // Set up tick handler to send positions back to the main thread
  simulation.on('tick', () => {
    // Extract only the position data to minimize message size
    const positions = nodes.map((node: GraphNode) => ({
      id: node.id,
      x: node.x,
      y: node.y
    }));

    // Send positions back to the main thread
    postMessage({ type: 'tick', positions });
  });

  // When simulation ends, send a final message
  simulation.on('end', () => {
    const positions = nodes.map((node: GraphNode) => ({
      id: node.id,
      x: node.x,
      y: node.y
    }));

    postMessage({ type: 'end', positions });
  });

  // Allow the main thread to stop the simulation
  addEventListener('message', (event) => {
    if (event.data.type === 'stop') {
      simulation.stop();
    }
  });
});
