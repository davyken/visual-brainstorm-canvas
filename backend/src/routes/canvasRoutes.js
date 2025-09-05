import express from 'express';
import { createCanvas, getCanvas } from '../controllers/canvasController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, createCanvas);
router.get('/:id', authMiddleware, getCanvas);

export default router;