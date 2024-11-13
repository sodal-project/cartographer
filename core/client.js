const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const sanitize = require('sanitize-filename');

/**
 * Render Handlebars Template
 * 
 * @param {string} templateName - The name of the modules Handlebars template file
 * @param {object} data - The data to pass to the Handlebars template
 * 
 * @returns {string|boolean} - The compiled HTML content or false if the template name is invalid
 */
function render(moduleName, templateName, data) {
  
  // Path to the Handlebars template file

  // sanitize the template name
  templateName = sanitize(templateName);

  // validate the template name
  if(!templateName) {
    console.error('Invalid or empty template name');
    return false;
  }

  const templatePath = `/app/modules/${moduleName}/${templateName}`;
  
  // Read the template file
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  
  // Compile the template
  const template = Handlebars.compile(templateSource);

  // Generate the HTML by passing the data to the compiled template
  const html = template(data);

  // Return the HTML
  return html;
}

// Register Partials Manually
const registerPartials = (moduleName) => {

  const corePartialsDir = `/app/components`;
  const modulePartialsDir = `/app/modules/${moduleName}/components`;

  const partialsDir = moduleName? modulePartialsDir : corePartialsDir;

  const readPartials = (dir) => {
    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recursively read subdirectory
        readPartials(filePath);
      } else if (file.endsWith('.hbs')) {
        const name = path.relative(partialsDir, filePath).replace(/\\/g, '/').replace('.hbs', '');
        const template = fs.readFileSync(filePath, 'utf8');

        if(moduleName) { console.log('Registering partial:', name); }

        // Register the partial with the relative path name
        Handlebars.registerPartial(name, template);
      }
    });
  };

  // Start reading partials from the root directory
  readPartials(partialsDir);
};

module.exports = {
  render,
  registerPartials,
}