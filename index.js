require('dotenv').config();
const express = require("express");
const Handlebars = require('handlebars');
const { engine } = require('express-handlebars');
const config = require('./config');

// Import core functions
const core = require('./core/core.js');

// Import middlewares and helpers
const cookieParser = require('cookie-parser');
const registerPartials = require('./app/middlewares/registerPartials');
const handlebarsHelpers = require('./app/helpers/handlebarsHelpers');

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
app.set("views", config.viewsPath);

// Register Handlebars helpers
Object.keys(handlebarsHelpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, handlebarsHelpers[helperName]);
});

// Middleware configuration
app.use(registerPartials); // Register Handlebars partials
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Access cookies
app.use(express.static(config.publicPath)); // Serve static files

// Route configuration
app.use("/", authRoutes);
app.use("/mod", moduleRoutes);
app.use("/", coreRoutes);

// Start the server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
