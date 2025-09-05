import { v4 as uuidv4 } from 'uuid';
import Canvas from '../schemas/Canvas.js';

// Create a new canvas (room)
export const createCanvas = async (req, res) => {
  try {
    const canvasId = uuidv4();
    const shareableLink = `https://your-domain.com/canvas/${canvasId}`;

    const newCanvas = new Canvas({
      canvasId,
      shareableLink,
      createdBy: req.user._id,
    });

    await newCanvas.save();
    res.status(201).json({
      message: 'Canvas created successfully',
      canvasId,
      shareableLink
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get a canvas by its ID
export const getCanvas = async (req, res) => {
  try {
    const canvas = await Canvas.findOne({ canvasId: req.params.id });

    if (!canvas) {
      return res.status(404).json({ error: 'Canvas not found' });
    }

    res.status(200).json(canvas);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};