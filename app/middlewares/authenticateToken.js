const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Check both headers and cookies for the token, redirect if not found
  const token = authHeader?.split(' ')[1] || req.cookies['access_token'];
  if (token == null) {
    return res.redirect('/login');
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

module.exports = authenticateToken;
