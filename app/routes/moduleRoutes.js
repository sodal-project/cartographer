import express from "express";
const router = express.Router();
import multer from 'multer';
import authenticateToken from '../middlewares/authenticateToken.js';
import { handleModuleFunction, handleModuleFunctionDownload } from '../controllers/moduleController.js';

// Multer handles file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/:moduleName/:command', authenticateToken, handleModuleFunction);
router.post('/:moduleName/:command', handleModuleFunction);
router.post('/:moduleName/:command/upload', upload.single('file'), handleModuleFunction);
router.post('/:moduleName/:command/download', handleModuleFunctionDownload);

export default router;