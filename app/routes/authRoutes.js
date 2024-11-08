const express = require("express");
const router = express.Router();
const {
  renderLoginPage,
  handleLogin,
  renderRegisterPage,
  handleRegister,
  refreshToken,
  handleLogout,
} = require('../controllers/authController');

router.get("/login", renderLoginPage);
router.post("/login", handleLogin);
router.delete("/logout", handleLogout);
router.get("/register", renderRegisterPage);
router.post("/token", refreshToken);
router.post('/register', handleRegister);

module.exports = router;
