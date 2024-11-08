require('dotenv').config();
const express = require("express");
const Handlebars = require('handlebars');
const { engine } = require('express-handlebars');
const path = require('path');

// Import core functions
const core = require('./core/core.js');

// Import middlewares
const cookieParser = require('cookie-parser');
const registerPartials = require('./app/middlewares/registerPartials');

// Import routes
const authRoutes = require("./app/routes/authRoutes");
const moduleRoutes = require("./app/routes/moduleRoutes");
const coreRoutes = require("./app/routes/coreRoutes");

// Create an Express application
const app = express();

// Run the core initialization function
core.init();

// Set up Handlebars
app.engine("hbs", engine({ defaultLayout: false}));
app.set('view engine', 'hbs');
app.set("views", __dirname);

// Handlebars Helpers
Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});
Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});

// Middleware configuration
app.use(registerPartials); // Register Handlebars partials
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Access cookies
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// Route configuration
app.use("/", authRoutes);
app.use("/mod", moduleRoutes);
app.use("/", coreRoutes);

// Start the server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
