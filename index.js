const express = require("express");
const app = express();

// The root route
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Cartographer Docker</h1>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
