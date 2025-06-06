module.exports = {
  // Use a more targeted approach with webpack's resolve.alias
  // This will redirect imports of 'node:stream/web' to an empty module
  resolve: {
    alias: {
      'node:stream/web': false
    }
  }
};
