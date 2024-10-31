const fs = require('fs');
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

module.exports = {
  render,
}