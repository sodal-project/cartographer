import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import process from 'process';

// TODO: Temp data storage
let refreshTokens = [];

/**
 * Generate an access token using jwt
 * @param {*} user 
 * @returns 
 */
function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
}

/**
 * Render register page
 */ 
const renderRegisterPage = async (req, res) => {
  res.render("app/templates/register"); 
};

/**
 * Handle registering a new user
 */ 
const handleRegister = async (req, res) => {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;
  const client = new MongoClient(uri);

  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      password: hashedPassword
    };

    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('users');

    // Insert the new user document
    const result = await collection.insertOne(user);
    
    if (result.insertedId) {
      res.status(201).send({ message: 'User registered successfully' });
    } else {
      res.status(500).send({ message: 'Failed to register user' });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).send({ message: 'Internal server error' });
  } finally {
    await client.close();
  }
};

/**
 * Render login page
 */ 
const renderLoginPage = async (req, res) => {
  res.render("app/templates/login"); 
};

/**
 * Handle login and return tokens
 */
const handleLogin = async (req, res) => {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('users');

    // Find the user in the users collection by email
    const user = await collection.findOne({ email: req.body.email });

    // No user found
    if (!user) {
      return res.status(400).json({ message: 'Cannot find user' });
    }

    // Check if the user's password is valid
    const isValidPassword = await bcrypt.compare(req.body.password, user.password);
    if (!isValidPassword) {
      return res.status(403).json({ message: 'Invalid password' });
    }

    // Generate tokens for the user
    const userData = { name: user.name, email: user.email, role: user.role };
    const accessToken = generateAccessToken(userData);
    const refreshToken = jwt.sign(userData, process.env.REFRESH_TOKEN_SECRET);

    // Save the refresh token
    refreshTokens.push(refreshToken);

    // Set the access token in an HTTP-only cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict'
    });

    // Set the refresh token in another HTTP-only cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict'
    });

    // Return success response
    return res.status(200).redirect('/');
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.close();
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
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
};

/**
 * Logout and destroy the refresh token
 */
const handleLogout = async (req, res) => {
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
};

export {
  renderRegisterPage,
  handleRegister,
  renderLoginPage,
  handleLogin,
  refreshToken,
  handleLogout,
};
