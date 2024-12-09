import express from "express";
const router = express.Router();
import authenticateToken from '../middlewares/authenticateToken.js';
import { renderHomePage } from '../controllers/coreController.js';

router.get("/", authenticateToken, renderHomePage);
router.get("/:moduleName/:command/", authenticateToken, renderHomePage);

export default router;