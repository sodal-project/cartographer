import express from "express";
const router = express.Router();
import {
  renderLoginPage,
  handleLogin,
  renderRegisterPage,
  handleRegister,
  refreshToken,
  handleLogout,
} from '../controllers/authController.js';

router.get("/login", renderLoginPage);
router.post("/login", handleLogin);
router.delete("/logout", handleLogout);
router.get("/register", renderRegisterPage);
router.post("/token", refreshToken);
router.post('/register', handleRegister);

export default router;