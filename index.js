import express from "express";
import Handlebars from 'handlebars';
import { engine } from 'express-handlebars';
import config from './config.js';
import coreServer from './core/server.js';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import core functions
import core from './core/core.js';

// Import middlewares and helpers
import cookieParser from 'cookie-parser'; // Parse cookies
import handlebarsHelpers from './app/helpers/handlebarsHelpers.js'; // Register the handlebars helpers
import moduleStatics from './app/middlewares/moduleStatics.js';
import registerPartials from './app/middlewares/registerPartials.js';

// Import routes
import authRoutes from "./app/routes/authRoutes.js";
import moduleRoutes from "./app/routes/moduleRoutes.js";
import coreRoutes from "./app/routes/coreRoutes.js";

// Create an Express application
const app = express();

// Run the core initialization function
core.init();

// Register partials
registerPartials();

// Set up Handlebars
app.engine("hbs", engine({ defaultLayout: false}));
app.set('view engine', 'hbs');
app.set("views", config.viewsPath);

// Register Handlebars helpers
Object.keys(handlebarsHelpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, handlebarsHelpers[helperName]);
});

// Middleware configuration
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Access cookies
app.use(express.static(config.publicPath)); // Serve static files

// setup module static files
moduleStatics(path.join(__dirname, 'modules'))(app);

// Route configuration
app.use("/", authRoutes);
app.use("/mod", moduleRoutes);
app.use("/", coreRoutes);

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket
coreServer.realtime.init(server);

// Start server
server.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});