const express = require("express");
const path = require('path');

// Create an Express application
const app = express();

// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// The root route
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Cartographer</h1>
        <form action="/trigger-module" method="POST">
          <select name="name">
            <option value="module1">Module 1</option>
            <option value="module2">Module 2</option>
          </select>
          <select name="command">
            <option value="runIntegration">runIntegration</option>
            <option value="returnData">returnData</option>
          </select>
          <button type="submit">Submit</button>
        </form>
      </body>
    </html>
  `);
});

/**
 * Trigger a module
 * Accept a POST request from the client and call the appropriate module function
 */ 
app.post("/trigger-module", (req, res) => {
  // Get the name of the module and command (function) to call
  const { name, command } = req.body;
  
  // Load the module
  const modulePath = path.resolve('modules', name, 'index.js');
  const module = require(modulePath);

  // Call the module function and save the response
  const moduleResponse =  module[command]();

  // Send the response back to the client
  res.send(moduleResponse);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
