import express from 'express';
import { createCanvas, getCanvas } from '../controllers/canvasController.js';

const router = express.Router();

router.post('/', createCanvas);
router.get('/:id', getCanvas);

export default router;