const express = require("express");
const fs = require('fs');
const Handlebars = require('handlebars');
const path = require('path');
const { engine } = require('express-handlebars');

const multer = require('multer'); // enable file uploads from the client
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const core = require('./core/core.js');
core.init();

// Create an Express application
const app = express();

// Set up Handlebars
app.engine("hbs", engine({ 
  defaultLayout: false,
}));
app.set('view engine', 'hbs');
app.set("views", __dirname);

// Handlebars Helpers
Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

// Register Partials Manually
const registerPartials = () => {
  const partialsDir = path.join(__dirname, 'components');
  
  // Clear previously cached partials if necessary
  Handlebars.partials = {};

  fs.readdirSync(partialsDir).forEach(function (filename) {
    const matches = /^([^.]+).hbs$/.exec(filename);
    if (matches) {
      const name = matches[1]; // File name without extension
      const template = fs.readFileSync(path.join(partialsDir, filename), 'utf8');
      
      // Use Handlebars directly to register the partial
      Handlebars.registerPartial(name, template);
    }
  });
};

// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Middleware to serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

/**
 * Root
 * Serve the index.html file with no module loaded
 */ 
app.get("/", async (req, res) => {
  const data = {...core.coreData};
  registerPartials();
  res.render("core/index", data); 
});

/**
 * Get Module Function
 * Accept a Get request from the client and call the appropriate module function
 * Return the response to the client
 */
app.get('/mod/:moduleName/:command', async (req, res) => {
  const { moduleName, command } = req.params;

  try {
    // Call the module function and wait for the response
    const moduleResponse = await core.mod[moduleName][command](); 

    // Send the response back to the client
    res.send(moduleResponse);
  } catch (err) {
    console.error('Error calling module command:', err);
    res.status(500).send('Error executing module command');
  }
});

/**
 * Post Module Function
 * Accept a POST request from the client and call the appropriate module function passing the data
 * Return the response to the client
 */ 
app.post('/mod/:moduleName/:command', async (req, res) => {
  const { moduleName, command } = req.params;
  
  // Set Data
  const data = req.body;

  try {
    // Call the module function and wait for the response
    const moduleResponse = await core.mod[moduleName][command](data); 

    // Send the response back to the client
    res.send(moduleResponse);
  } catch (err) {
    console.error('Error calling module command:', err);
    res.status(500).send('Error executing module command');
  }
});

/**
 * Support File Uploads
 * 
 * Post Module Function with Multer Middleware for File Upload Support
 * Accept a multipart/form-data POST request from the client and call the appropriate module function
 * Return the response to the client
 */ 
app.post('/mod/:moduleName/:command/upload', upload.single('file'), async (req, res) => {
  const { moduleName, command } = req.params;
  
  // Set Data
  const data = req.body;
  data.file = req.file;

  try {
    // Call the module function and wait for the response
    const moduleResponse = await core.mod[moduleName][command](data); 

    // Send the response back to the client
    res.send(moduleResponse);
  } catch (err) {
    console.error('Error calling module command:', err);
    res.status(500).send('Error executing module command');
  }
});

/**
 * Draw the root view with a module loaded
 */ 
app.get("/:moduleName/:command", async (req, res) => {
  const { moduleName, command } = req.params;
  const data = {...core.coreData, currentModule: moduleName };
  
  registerPartials();

  // Call the module function and set the response in the main attribute
  if (moduleName && command) {
    try {
      const moduleResponse = await core.mod[moduleName][command]();
      data.main = moduleResponse
    } catch (err) {
      console.error('Error calling module command:', err);
      res.status(500).send('Error executing module command');
    }
  }
  
  res.render("core/index", data); 
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
