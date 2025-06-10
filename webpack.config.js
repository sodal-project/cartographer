// Custom webpack configuration to handle Node.js core modules and protocols
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const path = require('path');

module.exports = {
  plugins: [
    new NodePolyfillPlugin()
  ],
  module: {
    rules: [
      {
        // Apply our custom loader to all JavaScript files
        test: /\.(js|ts)$/,
        use: [
          {
            loader: path.resolve(__dirname, 'node-protocol-loader.js')
          }
        ],
        // Make sure to include node_modules in the transformation
        include: [
          path.resolve(__dirname, 'node_modules/@soulcraft/brainy')
        ]
      }
    ]
  },
  resolve: {
    fallback: {
      'fs': false,
      'path': false,
      'child_process': false,
      'util': false,
      'stream': require.resolve('stream-browserify'),
      'stream/web': require.resolve('web-streams-polyfill/dist/polyfill')
    }
  }
};
