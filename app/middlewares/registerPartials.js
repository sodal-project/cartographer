const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const registerPartials = (req, res, next) => {
  // Only register partials for GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const partialsDir = path.join(__dirname, '../../components');
  Handlebars.partials = {}; // Clear cache if necessary

  const readPartials = (dir) => {
    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        readPartials(filePath);
      } else if (file.endsWith('.hbs')) {
        const name = path.relative(partialsDir, filePath).replace(/\\/g, '/').replace('.hbs', '');
        const template = fs.readFileSync(filePath, 'utf8');
        Handlebars.registerPartial(name, template);
      }
    });
  };

  readPartials(partialsDir);
  next();
};

module.exports = registerPartials;
