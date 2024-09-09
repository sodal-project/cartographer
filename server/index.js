const express = require("express");
const simpleGit = require("simple-git");

// Standard Node.js modules
const { fork, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

// Setup
const app = express();
const git = simpleGit();

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Cartographer OS Alpha</h1>
        <form action="/get-module" method="POST">
          <button type="submit">Install Module</button>
        </form>
      </body>
    </html>
  `);
});

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
    execFile("npm", ["install"], { cwd: repoDir }, async (err, stdout, stderr) => {
      if (err) {
        return res.status(500).send(`Error installing dependencies: ${stderr}`);
      }

      // Fork the child process and listen for messages
      const child = fork(path.join(repoDir, "index.js"));  // Fork the child module

      let childMessage = "no message received";

      // Listen for messages from the child process
      await child.on('message', (message) => {
        console.log('Message from child:', message);
        childMessage = message;
        console.log('childMessage:', childMessage);
      });
      // child.stdout.on("data", (data) => {
      //   console.log(`stdout: ${data}`);
      // });
      // child.stderr.on("data", (data) => {
      //   console.error(`stderr: ${data}`);
      // });
      // child.on("close", (code) => {
      //   console.log(`Child process exited with code ${code}`);
      // });

      // Send a response to the client
      res.send(
        `
          <p>Repository downloaded, dependencies installed, and project started.</p>
          <p>Message from child: ${childMessage}</p>
        `
      );
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while processing the request.");
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
