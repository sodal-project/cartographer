// Custom webpack loader to transform node: protocol imports
module.exports = function(source) {
  // Replace imports from 'node:stream/web' with imports from 'web-streams-polyfill/dist/polyfill'
  const transformedSource = source.replace(
    /import\s+{([^}]*)}\s+from\s+['"]node:stream\/web['"]/g,
    "import {$1} from 'web-streams-polyfill/dist/polyfill'"
  );

  return transformedSource;
};
