import path from 'path';
import fs from 'fs';
import express from 'express';

function moduleStatics(modulesPath) {
  return function(app) {
    if (!fs.existsSync(modulesPath)) {
      console.log('No modules directory found');
      return;
    }

    // Read all module directories
    const modules = fs.readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    modules.forEach(moduleName => {
      const publicPath = path.join(modulesPath, moduleName, 'public');
      if (fs.existsSync(publicPath)) {
        const mountPath = `/public/${moduleName}`;
        
        // Log the available subdirectories for debugging
        const subdirs = fs.readdirSync(publicPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        console.log(`Serving static files for module ${moduleName}:`);
        console.log(`  Base path: ${mountPath}`);
        console.log(`  Available subdirectories: ${subdirs.join(', ')}`);

        app.use(mountPath, express.static(publicPath, {
          setHeaders: (res, filepath) => {
            if (filepath.endsWith('.css')) {
              res.setHeader('Content-Type', 'text/css');
            } else if (filepath.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript');
            }
            res.setHeader('Cache-Control', 'public, max-age=0');
          }
        }));
      }
    });
  };
}

export default moduleStatics; 