const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Upload a JavaScript Plugin</h1>
        <form action="/upload" method="post" enctype="multipart/form-data">
          <input type="file" name="plugin" accept=".js" required />
          <button type="submit">Upload Plugin</button>
        </form>
      </body>
    </html>
  `);
});

app.post("/upload", upload.single("plugin"), (req, res) => {
  const pluginPath = path.join(__dirname, "uploads", req.file.filename);
  const pluginCode = fs.readFileSync(pluginPath, "utf8");
  try {
    const plugin = new Function(pluginCode);
    plugin(); // execute the uploaded JS file as a function
    res.send("Plugin executed successfully!");
  } catch (err) {
    console.error("Error executing plugin:", err);
    res.status(500).send("Error executing plugin");
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
