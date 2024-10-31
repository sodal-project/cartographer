const express = require("express");
const fs = require('fs');
const Handlebars = require('handlebars');
const path = require('path');
const { engine } = require('express-handlebars');

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
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

// Register Partials Manually
const registerPartials = () => {
  const partialsDir = path.join(__dirname, 'components');

  // Clear previously cached partials if necessary
  Handlebars.partials = {};

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

        // Register the partial with the relative path name
        Handlebars.registerPartial(name, template);
      }
    });
  };

  // Start reading partials from the root directory
  readPartials(partialsDir);
};


// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Middleware to serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Core Data - this will live in the config database eventually
const coreData = {
  user: {
    name: "Dade Murphy",
  },
  main: '',
  currentModule: 'none',
  modules: [
    {
      folder: "module1",
      label: "Module 1",
    },
    {
      folder: "module2",
      label: "Module 2",
    },
    {
      folder: "long-process",
      label: "Long Process",
    },
    {
      folder: "table-demo",
      label: "Table Demo",
    },
  ]
}

/**
 * Root
 * Serve the index.html file with no module loaded
 */ 
app.get("/", async (req, res) => {
  const data = {...coreData};
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
  const modulePath = path.resolve('modules', moduleName, 'index.js');
  const module = require(modulePath);

  try {
    // Call the module function and wait for the response
    const moduleResponse = await module[command]();

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
  const modulePath = path.resolve('modules', moduleName, 'index.js');
  const module = require(modulePath);
  
  // Set Data
  const data = req.body;

  try {
    // Call the module function and wait for the response
    const moduleResponse = await module[command](data);

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
  const data = {...coreData, currentModule: moduleName };
  
  registerPartials();

  // Call the module function and set the response in the main attribute
  if (moduleName && command) {
    const modulePath = path.resolve('modules', moduleName, 'index.js');
    const module = require(modulePath);
    try {
      const moduleResponse = await module[command]();
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
