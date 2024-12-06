const path = require('path');
const fs = require('fs');
const express = require('express');

function moduleStatics(modulesPath) {
  return function(app) {
    // Check if modules directory exists
    if (!fs.existsSync(modulesPath)) {
      console.log('No modules directory found');
      return;
    }

    // Read all module directories
    const modules = fs.readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // For each module, check for a public directory and serve it
    modules.forEach(moduleName => {
      const publicPath = path.join(modulesPath, moduleName, 'public');
      if (fs.existsSync(publicPath)) {
        const mountPath = `/modules/${moduleName}/public`;
        console.log(`Serving static files for module ${moduleName} at ${mountPath}`);
        
        // Configure static middleware with options
        app.use(mountPath, express.static(publicPath, {
          setHeaders: (res, path) => {
            // Set proper MIME type for CSS files
            if (path.endsWith('.css')) {
              res.setHeader('Content-Type', 'text/css');
            }
            // Set caching headers
            res.setHeader('Cache-Control', 'public, max-age=0');
          }
        }));
      }
    });
  };
}

module.exports = moduleStatics; 