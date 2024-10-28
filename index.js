const express = require("express");
const fs = require('fs');
const Handlebars = require('handlebars');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Temp data storage
let refreshTokens = [];
let users = [];
const posts = [
  {
    username: 'Kyle',
    title: 'Post 1'
  },
  {
    username: 'Jim',
    title: 'Post 2'
  }
];
const coreData = {
  main: '',
  currentModule: 'none',
  modules: [
    {
      folder: "module1",
      label: "Module 1",
    },
    {
      folder: "module2",
      label: "Module 2",
    },
    {
      folder: "long-process",
      label: "Long Process",
    },
  ]
}

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

// Register Partials Manually
const registerPartials = () => {
  const partialsDir = path.join(__dirname, 'components');
  
  // Clear previously cached partials if necessary
  Handlebars.partials = {};

  fs.readdirSync(partialsDir).forEach(function (filename) {
    const matches = /^([^.]+).hbs$/.exec(filename);
    if (matches) {
      const name = matches[1]; // File name without extension
      const template = fs.readFileSync(path.join(partialsDir, filename), 'utf8');
      
      // Use Handlebars directly to register the partial
      Handlebars.registerPartial(name, template);
    }
  });
};

// Middleware to parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to access cookies
app.use(cookieParser());

// Middleware to serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Authenticate Token Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Check both headers and cookies
  const token = authHeader?.split(' ')[1] || req.cookies['access_token'];

  // Check if we have a token
  if (token == null) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  // Verify the token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    // We have a valid token
    req.user = user;
    next();
  });
}

// Generate an access token
function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '120m' });
}

/**
 * Temp posts endpoint
 */
app.get("/posts", authenticateToken, (req, res) => {
  res.json(posts);
});

/**
 * Root
 * Serve the index.html file with no module loaded
 */ 
app.get("/", authenticateToken, async (req, res) => {
// app.get("/", async (req, res) => {
  console.log('req:', req.user);
  const data = {...coreData, user: req.user};
  registerPartials();
  res.render("core/index", data); 
});

/**
 * Login Forn
 */ 
app.get("/login", async (req, res) => {
  registerPartials();
  res.render("core/login"); 
});

/**
 * Login and return tokens
 */
app.post("/login", async (req, res) => {
  // Find the user in the database
  const user = users.find(user => user.email === req.body.email);
  
  // No user found
  if (user == null) {
    return res.status(400).json({ message: 'Cannot find user' });
  }

  // Check if the user's password is valid
  try {
    const isValidPassword = await bcrypt.compare(req.body.password, user.password);
    if (!isValidPassword) {
      return res.status(403).json({ message: 'Invalid password' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }

  // Generate tokens for the user
  const userData = { name: user.name, email: user.email, role: user.role };
  const accessToken = generateAccessToken(userData);
  const refreshToken = jwt.sign(userData, process.env.REFRESH_TOKEN_SECRET);

  // Save the refresh token (You should store this in the DB)
  refreshTokens.push(refreshToken);
  
  // Set the access token in an HTTP-only cookie
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Send cookies only over HTTPS in production
    sameSite: 'Strict' // Protect against CSRF attacks
  });

  // Set the refresh token in another HTTP-only cookie
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });

  // Return success response
  return res.status(200).json({ message: 'Login successful' });
});

/**
 * Logout and destroy the refresh token
 */
app.delete("/logout", async (req, res) => {
  // Remove the refresh token from the server's storage
  refreshTokens = refreshTokens.filter(token => token !== req.cookies['refresh_token']);

  // Clear the cookies (both access and refresh tokens)
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });

  // Indicate a redirect in the response header
  res.set('HX-Redirect', '/login');

  // Return success response
  res.status(204).json({ message: 'Logout successful' });
});

/**
 * Refresh access token
 */
app.post("/token", async (req, res) => {
  const refreshToken = req.body.token;

  // Check if refresh token exists
  if (refreshToken == null) return res.sendStatus(401);
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403);
  
  // Validate refresh token
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

/**
 * Register Form
 */ 
app.get("/register", async (req, res) => {
  registerPartials();
  res.render("core/register"); 
});

/**
 * Users
 */
app.get("/users", async (req, res) => {
  res.json(users);
});

// Register a new user
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      password: hashedPassword
    }
    users.push (user)
    res.status(201).send();
  } catch {
    res.status(500).send();
  }
});


/**
 * Get Module Function
 * Accept a Get request from the client and call the appropriate module function
 * Return the response to the client
 */
app.get('/mod/:moduleName/:command', async (req, res) => {
  const { moduleName, command } = req.params;
  const modulePath = path.resolve('modules', moduleName, 'index.js');
  const module = require(modulePath);

  try {
    // Call the module function and wait for the response
    const moduleResponse = await module[command]();

    // Send the response back to the client
    res.send(moduleResponse);
  } catch (err) {
    console.error('Error calling module command:', err);
    res.status(500).send('Error executing module command');
  }
});

/**
 * Post Module Function
 * Accept a POST request from the client and call the appropriate module function passing the data
 * Return the response to the client
 */ 
app.post('/mod/:moduleName/:command', async (req, res) => {
  const { moduleName, command } = req.params;
  const modulePath = path.resolve('modules', moduleName, 'index.js');
  const module = require(modulePath);
  
  // Set Data
  const data = req.body;

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

/**
 * Draw the root view with a module loaded
 */ 
app.get("/:moduleName/:command", async (req, res) => {
  const { moduleName, command } = req.params;
  const data = {...coreData, currentModule: moduleName };
  
  registerPartials();

  // Call the module function and set the response in the main attribute
  if (moduleName && command) {
    const modulePath = path.resolve('modules', moduleName, 'index.js');
    const module = require(modulePath);
    try {
      const moduleResponse = await module[command]();
      data.main = moduleResponse
    } catch (err) {
      console.error('Error calling module command:', err);
      res.status(500).send('Error executing module command');
    }
  }
  
  res.render("core/index", data); 
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
