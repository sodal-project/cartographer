<div align="center">
<h1><img src="https://github.com/sodal-project.png" alt="Sodal Logo" width="30" style="vertical-align: text-bottom;" /> Cartographer</h1>

<p>
<img src="https://img.shields.io/badge/version-0.2.13-blue.svg" alt="Version">
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
<a href="https://angular.io/"><img src="https://img.shields.io/badge/Angular-19.2.0-red.svg" alt="Angular"></a>
<a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-v20.0.0+-green.svg" alt="Node"></a>
<img src="https://img.shields.io/badge/Brainy-0.7.4-purple.svg" alt="Soulcraft Brainy">
<a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7.2-blue.svg" alt="TypeScript"></a>
<a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p><strong>"Discover the hidden connections in your data that you never knew existed."</strong></p>
</div>

## Overview

Cartographer is a powerful data visualization and semantic search application designed to help you explore and understand complex relationships between entities. Using advanced vector embeddings and D3.js-powered interactive graph visualizations, Cartographer makes it easy to discover connections and patterns in your data that traditional search tools miss.

Imagine being able to visualize your entire knowledge base as an interactive network, where related concepts are automatically linked together based on their semantic meaning, not just keyword matches. That's what Cartographer delivers - a revolutionary way to navigate, search, and understand your information landscape through real-time, explorable visualizations that respond dynamically to your interactions.

## Why Cartographer?

In a world drowning in information, traditional search tools fall short. Cartographer stands out by:

- **Revealing Hidden Connections**: Discover relationships between concepts that keyword searches would never find
- **Providing Visual Context**: See your entire information landscape at a glance
- **Working Anywhere**: Full offline capability means your knowledge is always accessible
- **Scaling Effortlessly**: From personal knowledge bases to enterprise-scale data networks
- **Enhancing Professional Networks**: Connect talent with opportunities by visualizing skills, experience, and collaboration potential based on semantic relationships

## Features

- **Vector-Based Semantic Search**: Find related entities based on meaning, not just keywords. Cartographer understands that "automobile" and "car" are related concepts, even if they don't share the same letters.

- **Interactive Graph Visualization**: Explore relationships through an intuitive D3.js-powered force-directed graph with real-time updates. Zoom, pan, and click through your data network to discover unexpected connections. The visualization dynamically responds to data changes, with smooth transitions and animations that help maintain your mental map of the information landscape.

- **Offline Capability**: Continue working even without an internet connection. Your data is synchronized when you're back online, ensuring you never lose your work.

- **Progressive Web App**: Install on your device for a native-like experience. Cartographer works on desktop, tablet, and mobile with the same smooth experience.

- **Responsive Design**: Optimized for all screen sizes. The interface automatically adapts to provide the best experience whether you're on a phone, tablet, or desktop.

- **Vector Embedding Integration**: Built with powerful vector search technology that enables Cartographer's advanced semantic understanding capabilities.

- **Pipeline Processing**: Leveraging Brainy's sequential pipeline architecture for efficient data processing and transformation, allowing for complex operations to be broken down into manageable steps.

- **Extensibility through Augmentations**: Easily extend functionality with Brainy's augmentation system, enabling custom processing steps to be integrated seamlessly into the pipeline.

- **Storage Management**: Monitor and manage local storage usage with intuitive tools that help you optimize performance.

## Real-World Applications

Cartographer is being used by professionals across various fields:

- **Researchers** mapping academic literature and discovering cross-disciplinary connections
- **Knowledge workers** organizing complex information and finding relationships between documents
- **Investigators** visualizing case data and uncovering hidden relationships
- **Educators** creating interactive knowledge maps for students
- **Content creators** organizing ideas and finding new connections between topics
- **Recruiters** visualizing talent networks, identifying skill relationships, and discovering ideal candidates through semantic matching
- **Job seekers** mapping career paths, identifying skill gaps, and discovering connections to potential employers
- **Collaborators** finding partners with complementary skills, visualizing team networks, and discovering cross-disciplinary collaboration opportunities

## Technology Stack

- **Frontend**: Angular 19 - The latest version of Google's powerful frontend framework
- **UI Components**: Angular Material - Polished, accessible components following Material Design principles
- **Visualization**: D3.js - The gold standard for data visualization on the web, powering Cartographer's dynamic, interactive network graphs with real-time physics simulations and smooth transitions
- **Core Platform**: Brainy - The foundation of Cartographer, providing advanced semantic search using vector embeddings, pipeline processing, and extensibility through augmentations
- **State Management**: NgRx - Predictable state management inspired by Redux
- **PWA Support**: Angular Service Worker - Enabling offline capabilities and app-like experiences

## Quick Start

Cartographer is a powerful tool for visualizing and exploring complex data relationships.

## Installation

### Prerequisites

- Node.js 20.0.0 or higher (even-numbered versions recommended for production)
  - Odd-numbered Node.js versions (like 21.x, 23.x) are not recommended for production as they don't enter LTS status
  - For production environments, use even-numbered LTS versions like 20.x, 22.x, etc.
- npm (comes with Node.js)

### Setup

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd cartographer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Brainy:
   - Set up your environment configuration in `src/environments/environment.ts`
   - Configure pipeline options according to your needs
   - Set up any custom augmentations you want to use

## Usage

### Development Server

Start the development server:

```bash
npm start
```

Navigate to `http://localhost:4200/` in your browser.

### Building for Production

Build the application for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Deployment

Deploy to GitHub Pages:

```bash
npm run deploy
```

## User Guide

### Getting Started

After installation, you'll be greeted with the Dashboard. Here's how to get started:

1. **Create your first entity**: Click the "+" button in the dashboard to add your first node
2. **Add some connections**: Use the relationship editor to connect entities
3. **Start exploring**: Switch to the Explore view to see your knowledge graph take shape

### Search

Cartographer offers two powerful search modes:

1. **Semantic Search (Network Mode)**:
   - Type a concept or question in the search bar
   - Cartographer uses vector embeddings to find semantically related entities
   - Results are ranked by relevance, not just keyword matching
   - Example: Searching for "transportation" might return "car", "bicycle", and "logistics"

2. **Local Search**:
   - Toggle to Local mode for traditional keyword search
   - Instantly filter your local data
   - Combine with semantic search results for precision

3. **Viewing Results**:
   - Switch between list view for scanning many results
   - Graph view to see how results connect to each other

### Explore

The Explore view is where Cartographer truly shines with its D3.js-powered interactive visualization:

1. **Navigation**:
   - **Pan**: Click and drag the background to navigate the knowledge space
   - **Zoom**: Use mouse wheel or pinch gestures for seamless zooming with adaptive detail levels
   - **Select**: Click on any node to view details with real-time property inspection
   - **Expand**: Double-click a node to dynamically reveal its connections with smooth force-directed animations

2. **Real-time Visualization**:
   - **Live Updates**: Watch as your graph responds instantly to data changes
   - **Physics Simulation**: Experience realistic force-directed layouts that intuitively organize complex relationships
   - **Interactive Forces**: Adjust attraction and repulsion forces in real-time to optimize your view
   - **Drag & Manipulate**: Directly interact with nodes to rearrange your knowledge graph and see connections adapt dynamically

3. **Visualization Controls**:
   - Adjust node size, spacing, and link strength with immediate visual feedback
   - Filter by relationship type with animated transitions between views
   - Change color schemes for better pattern recognition and data categorization
   - Save custom views for later reference with persistent layout states

4. **Advanced Features**:
   - **Path Finding**: Discover how two seemingly unrelated entities are connected with highlighted path animations
   - **Clustering**: Automatically group related entities with visual cluster boundaries
   - **Centrality Analysis**: Identify the most important nodes in your network with size and color emphasis
   - **Time-based Evolution**: Visualize how your knowledge graph evolves over time with playback controls

### Dashboard

The command center for your knowledge graph:

1. **Storage Management**:
   - Monitor local and cloud storage usage
   - Optimize storage with compression options
   - Export and backup your data

2. **System Controls**:
   - Toggle between online and offline modes
   - Check for and apply updates
   - Adjust synchronization settings

3. **User Settings**:
   - Customize the interface
   - Manage authentication
   - Set privacy preferences


## Community and Support

- **Documentation**: Comprehensive guides will be available in the Wiki
- **Issues**: Report bugs or request features on our Issue Tracker


## Troubleshooting

### Angular Schema Validation Errors

If you encounter schema validation errors when building the project, it may be due to changes in the Angular schema between versions. Common issues include:

- **appShell property error**: The `appShell` property format has changed in Angular 19.2.x. It should be removed or updated according to the current schema.
- **serviceWorker property error**: In Angular 19.2.x, the `serviceWorker` property must be a boolean value, not a string path to a configuration file.

### Node.js Version Issues

- If you see warnings about using an odd-numbered Node.js version, consider switching to an even-numbered LTS version for production use.
- The project requires Node.js 20.0.0 or higher, but using versions like 20.x or 22.x is recommended for stability.

## Contributing

We welcome contributions to Cartographer! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

See our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Angular](https://angular.io/) - The web framework used
- [D3.js](https://d3js.org/) - For powerful data visualizations
- [Angular Material](https://material.angular.io/) - For UI components
- Brainy - The core platform that powers Cartographer's semantic search, pipeline processing, and extensibility features

---

<p align="center">
  <b>Cartographer: Mapping the connections that matter.</b>
</p>

Version: 0.2.13
