import express from 'express';
import Session from '../schemas/sessionSchema.js';
import Shape from '../schemas/shapeSchema.js';

const router = express.Router();

// Get session/canvas data
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId).populate('shapes');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get all shapes for this session
    const shapes = await Shape.find({ sessionId }).sort({ createdAt: 1 });
    
    res.json({
      session: {
        id: session._id,
        title: session.title,
        description: session.description,
        ownerId: session.ownerId,
        participants: session.participants,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      shapes: shapes.map(shape => ({
        id: shape._id.toString(),
        type: shape.type,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        radius: shape.radius,
        points: shape.points,
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        text: shape.text,
        fontSize: shape.fontSize,
        fontFamily: shape.fontFamily,
        imageSrc: shape.imageSrc,
        draggable: shape.draggable,
        tool: shape.tool,
        fromId: shape.fromId,
        toId: shape.toId,
        createdBy: shape.createdBy,
        createdAt: shape.createdAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching canvas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save canvas (create or update session with shapes)
router.post('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { shapes, title, description } = req.body;
    
    // Find or create session
    let session = await Session.findById(sessionId);
    
    if (!session) {
      // Create new session
      session = new Session({
        _id: sessionId,
        title: title || `Canvas ${new Date().toISOString().split('T')[0]}`,
        description: description || '',
        ownerId: 'anonymous', // TODO: Replace with actual user ID from auth
        isPrivate: false,
      });
      await session.save();
    } else {
      // Update existing session
      if (title) session.title = title;
      if (description) session.description = description;
      session.updatedAt = new Date();
      await session.save();
    }
    
    // Clear existing shapes for this session
    await Shape.deleteMany({ sessionId });
    
    // Save new shapes
    const shapePromises = shapes.map(shape => {
      const newShape = new Shape({
        ...shape,
        _id: shape.id,
        sessionId,
        createdBy: shape.createdBy || 'anonymous',
      });
      return newShape.save();
    });
    
    await Promise.all(shapePromises);
    
    res.json({ 
      success: true, 
      message: 'Canvas saved successfully',
      sessionId: session._id 
    });
  } catch (error) {
    console.error('Error saving canvas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new session/room
router.post('/', async (req, res) => {
  try {
    const { title, description, isPrivate } = req.body;
    
    const session = new Session({
      title: title || `Canvas ${new Date().toISOString().split('T')[0]}`,
      description: description || '',
      ownerId: 'anonymous', // TODO: Replace with actual user ID from auth
      isPrivate: isPrivate || false,
    });
    
    await session.save();
    
    res.json({ 
      success: true, 
      sessionId: session._id,
      session: {
        id: session._id,
        title: session.title,
        description: session.description,
        ownerId: session.ownerId,
        isPrivate: session.isPrivate,
        createdAt: session.createdAt,
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's sessions
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const sessions = await Session.find({
      $or: [
        { ownerId: userId },
        { 'participants.userId': userId }
      ]
    }).sort({ updatedAt: -1 });
    
    res.json({
      sessions: sessions.map(session => ({
        id: session._id,
        title: session.title,
        description: session.description,
        ownerId: session.ownerId,
        isPrivate: session.isPrivate,
        participants: session.participants,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Delete all shapes first
    await Shape.deleteMany({ sessionId });
    
    // Delete session
    const session = await Session.findByIdAndDelete(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Session deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
