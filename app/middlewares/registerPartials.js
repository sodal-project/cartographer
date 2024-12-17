import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

/**
 * Register partials manually
 * @returns {void}
 */
const registerPartials = () => {

  const partialsDir = `/app/components`;

  const readPartials = (dir) => {
    if (!fs.existsSync(dir)) {
      return;
    }

    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recursively read subdirectory
        readPartials(filePath);
      } else if (file.endsWith('.hbs')) {
        const name = path.relative(partialsDir, filePath).replace(/\\/g, '/').replace('.hbs', '');
        const template = fs.readFileSync(filePath, 'utf8');

        // Register the partial with the relative path name
        Handlebars.registerPartial(name, template);
      }
    });
  };

  // Start reading partials from the root directory
  readPartials(partialsDir);
};

export default registerPartials;