const express = require("express");
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const { renderHomePage } = require('../controllers/coreController');

router.get("/", authenticateToken, renderHomePage);
router.get("/:moduleName/:command", authenticateToken, renderHomePage);

module.exports = router;
