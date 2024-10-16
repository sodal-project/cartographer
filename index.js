const express = require("express");
const path = require('path');
const { engine } = require('express-handlebars');

// Create an Express application
const app = express();

// Set up Handlebars
app.engine("hbs", engine({ defaultLayout: false }));
app.set('view engine', 'hbs');
app.set("views", __dirname);

// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Middleware to serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

/**
 * Root
 * Serve the index.html file from the core directory
 */ 
app.get("/", (req, res) => {
  const data ={
    user: {
      name: "Dade Murphy",
    },
    modules: [
      {
        folder: "module1",
        label: "Module 1",
      },
      {
        folder: "module2",
        label: "Module 2",
      },
    ]
  }

  res.render("core/index", data); 
});

app.get('/module', async (req, res) => {
  const { name, command } = req.query;
  const modulePath = path.resolve('modules', name, 'index.js');
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
 * Trigger a module
 * Accept a POST request from the client and call the appropriate module function
 */ 
app.post("/trigger-module", async (req, res) => {
  // Get the name of the module and command (function) to call
  const { name, command, key, value } = req.body;
  
  // Set Data
  //
  // TODO: We need a more flexible way to pass data module functions
  // for now we are just passing a single key-value. This should be updated
  // to allow for multiple key-value pairs.
  const data = {};
  if (key) {
    data[key.toLowerCase()] = value || "";
  }

  // Load the module
  const modulePath = path.resolve('modules', name, 'index.js');
  const module = require(modulePath);

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

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
