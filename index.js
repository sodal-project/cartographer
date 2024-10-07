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
          <input type="text" name="data" style="width: 240px;" />
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
  const { name, command, data } = req.body;
  
  // Parse Data
  // Data comes in as a string from the form, but we need it as an object
  let parsedData;
  try {
    parsedData = JSON.parse(data); // Parse the data if it's a string
  } catch (e) {
    console.error('Error parsing data:', e);
    return res.status(400).send('Invalid data format');
  }
  console.log('parsedData', parsedData);

  // Load the module
  const modulePath = path.resolve('modules', name, 'index.js');
  const module = require(modulePath);

  // Call the module function and save the response
  const moduleResponse = module[command](parsedData);

  // Send the response back to the client
  res.send(moduleResponse);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
