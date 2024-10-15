const express = require("express");
const path = require('path');

// Create an Express application
const app = express();

// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// The root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "core", "index.html"));
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
