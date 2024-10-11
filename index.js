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
          <div style="margin-bottom: 20px;">
            <select name="name" style="width: 200px;">
              <option value="module1">Module 1</option>
              <option value="module2">Module 2</option>
            </select>
          </div>
          <div style="margin-bottom: 30px;">
            <select name="command" style="width: 200px;">
              <option value="readConfig">readConfig</option>
              <option value="writeConfig">writeConfig</option>
              <option value="deleteConfig">deleteConfig</option>
              <option value="longProcess">longProcess</option>
            </select>
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 10px;">Key:</label>
            <input type="text" name="key" style="width: 200px;" />
          </div>
          <div style="margin-bottom: 30px;">
            <label style="display: block; margin-bottom: 10px;">Value:</label>
            <input type="text" name="value" style="width: 200px;" />
          </div>
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
