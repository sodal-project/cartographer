require('dotenv').config();
const express = require("express");
const Handlebars = require('handlebars');
const { engine } = require('express-handlebars');
const path = require('path');
const config = require('./config');

// Import core functions
const core = require('./core/core.js');

// Import middlewares and helpers
const cookieParser = require('cookie-parser');
const moduleStatics = require('./app/middlewares/moduleStatics');
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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(config.publicPath));

// Set up module static files
moduleStatics(path.join(__dirname, 'modules'))(app);

// Route configuration
app.use("/", authRoutes);
app.use("/mod", moduleRoutes);
app.use("/", coreRoutes);

// Start the server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
