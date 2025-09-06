import express from 'express';
import { body, validationResult } from 'express-validator';
import Canvas from '../schemas/canvasSchema.js';
import Room from '../schemas/roomSchema.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const shapeValidation = [
  body('type').isIn(['rectangle', 'circle', 'line', 'text', 'freehand', 'arrow', 'polygon']),
  body('position.x').isNumeric(),
  body('position.y').isNumeric(),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/canvases/:roomId - Get canvas for a room
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    // First check if room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Get or create canvas for this room
    let canvas = await Canvas.findOne({ roomId });
    
    if (!canvas) {
      // Create new canvas for the room
      const canvasId = Canvas.generateCanvasId();
      canvas = new Canvas({
        canvasId,
        roomId,
        name: `${room.name} - Canvas`,
      });
      await canvas.save();

      // Update room with canvas reference
      room.canvasData.canvasId = canvasId;
      await room.save();
    }

    res.status(200).json({
      canvas: {
        canvasId: canvas.canvasId,
        roomId: canvas.roomId,
        name: canvas.name,
        settings: canvas.settings,
        shapes: canvas.shapes,
        version: canvas.version,
        lastModified: canvas.lastModified,
      },
    });
  } catch (error) {
    console.error('Error fetching canvas:', error);
    res.status(500).json({ message: 'Error fetching canvas', error: error.message });
  }
});

// POST /api/canvases/:roomId/shapes - Add shape to canvas
router.post('/:roomId/shapes', authMiddleware, shapeValidation, handleValidationErrors, async (req, res) => {
  try {
    const { roomId } = req.params;
    const shapeData = req.body;
    const userId = req.user._id;

    // Verify room exists and user has permission
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is in the room
    const userInRoom = room.participants.some(p => 
      p.userId && p.userId.toString() === userId.toString() && p.isActive
    );
    if (!userInRoom && !room.settings.allowGuests) {
      return res.status(403).json({ message: 'Not authorized to modify this canvas' });
    }

    // Get canvas
    let canvas = await Canvas.findOne({ roomId });
    if (!canvas) {
      return res.status(404).json({ message: 'Canvas not found' });
    }

    // Add creator info to shape
    shapeData.createdBy = req.user.name || req.user.email;
    shapeData.id = Canvas.generateShapeId();

    // Add shape to canvas
    await canvas.addShape(shapeData);

    // Update room activity
    room.updateActivity();

    console.log(`Shape added to canvas ${canvas.canvasId} by user ${req.user.email}`);

    res.status(201).json({
      message: 'Shape added successfully',
      shape: canvas.shapes[canvas.shapes.length - 1],
      version: canvas.version,
    });
  } catch (error) {
    console.error('Error adding shape:', error);
    res.status(500).json({ message: 'Error adding shape', error: error.message });
  }
});

export default router;