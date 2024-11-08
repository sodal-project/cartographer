const express = require("express");
const router = express.Router();
const multer = require('multer');
const authenticateToken = require('../middlewares/authenticateToken');
const { handleModuleFunction } = require('../controllers/moduleController');

// Multer handles file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/:moduleName/:command', authenticateToken, handleModuleFunction);
router.post('/:moduleName/:command', handleModuleFunction);
router.post('/:moduleName/:command/upload', upload.single('file'), handleModuleFunction);

module.exports = router;