const express = require("express");
const simpleGit = require("simple-git");

// Standard Node.js modules
const { fork, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

// Setup
const app = express();
const git = simpleGit();

// The root route
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Cartographer</h1>
        <form action="/get-module" method="POST">
          <button type="submit">Install Module</button>
        </form>
      </body>
    </html>
  `);
});

// The route to download and install the module
app.post("/get-module", async (req, res) => {
  const repoUrl = "https://github.com/sodal-project/cartographer-test-module.git";
  const repoDir = path.join(__dirname, "modules");

  try {
    // If directory exists, remove it
    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
    
    // Clone the repository
    await git.clone(repoUrl, repoDir);

    // Install dependencies
    execFile("npm", ["install"], { cwd: repoDir }, (err, stdout, stderr) => {
      if (err) {
        return res.status(500).send(`Error installing dependencies: ${stderr}`);
      }

      // Run the child module
      const child = fork(path.join(repoDir, "index.js"));  // Fork the child module

      // Store the message received from the child module
      let childMessage = "no message received";

      // Listen for messages from the child module
      const messagePromise = new Promise((resolve, reject) => {
        child.on('message', (message) => {
          console.log('Message from child:', message);
          childMessage = message;
          resolve();
        });

        child.on('error', (err) => {
          reject(err);
        });
      });

      // Send a response to the client after receiving the message
      messagePromise.then(() => {
        res.send(
          `
            <p>Repository downloaded, dependencies installed, and project started.</p>
            <p>Message from child: ${childMessage}</p>
          `
        );
      }).catch((err) => {
        console.error('Error receiving message from child:', err);
        res.status(500).send('An error occurred while receiving message from child.');
      });

    });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while processing the request.");
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
