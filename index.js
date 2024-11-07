require('dotenv').config();
const express = require("express");
const Handlebars = require('handlebars');
const { engine } = require('express-handlebars');
const path = require('path');

// Middlewares
const cookieParser = require('cookie-parser');
const registerPartials = require('./app/middlewares/registerPartials');
const authenticateToken = require('./app/middlewares/authenticateToken');

// Import controller functions
const {
  renderLoginPage,
  handleLogin,
  renderRegisterPage,
  handleRegister,
  refreshToken,
  handleLogout,
} = require('./app/controllers/auth');
const { renderHomePage } = require('./app/controllers/core');
const { handleModuleFunction } = require('./app/controllers/module');

const multer = require('multer'); // enable file uploads from the client
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const core = require('./core/core.js');
core.init();

// Create an Express application
const app = express();

// Set up Handlebars
app.engine("hbs", engine({ 
  defaultLayout: false,
}));
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

// Register Handlebars partials
app.use(registerPartials);

// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to access cookies
app.use(cookieParser());

// Middleware to serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

/**
 * Routes
*/ 
app.get("/", authenticateToken, renderHomePage);

// Authentication Routes
app.get("/login", renderLoginPage);
app.post("/login", handleLogin);
app.delete("/logout", handleLogout);
app.get("/register", renderRegisterPage);
app.post("/token", refreshToken);
app.post('/register', handleRegister);

// Module Function Routes
app.get('/mod/:moduleName/:command', authenticateToken, handleModuleFunction);
app.post('/mod/:moduleName/:command', handleModuleFunction);
app.post('/mod/:moduleName/:command/upload', upload.single('file'), handleModuleFunction);

// Home with a module passed
app.get("/:moduleName/:command", authenticateToken, renderHomePage);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
