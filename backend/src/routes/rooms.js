import express from 'express';
import { body, validationResult } from 'express-validator';
import Room from '../schemas/roomSchema.js';
import authMiddleware from '../middleware/auth.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Validation middleware
const createRoomValidation = [
  body('name').notEmpty().trim().withMessage('Room name is required'),
  body('description').optional().trim(),
  body('isPublic').optional().isBoolean(),
  body('password').optional(),
  body('maxParticipants').optional().isInt({ min: 1, max: 100 }),
];

const joinRoomValidation = [
  body('roomId').notEmpty().withMessage('Room ID is required'),
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('password').optional(),
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /api/rooms - Create a new room
router.post('/', authMiddleware, createRoomValidation, handleValidationErrors, async (req, res) => {
  try {
    const { name, description, isPublic = true, password, maxParticipants = 50 } = req.body;
    const userId = req.user._id;

    // Generate unique room ID
    let roomId;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      roomId = Room.generateRoomId();
      const existingRoom = await Room.findOne({ roomId });
      if (!existingRoom) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ message: 'Failed to generate unique room ID' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const room = new Room({
      roomId,
      name,
      description,
      createdBy: userId,
      isPublic,
      password: hashedPassword,
      maxParticipants,
    });

    // Add creator as first participant
    await room.addParticipant(userId, req.user.name);
    await room.save();

    const shareableLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/room/${roomId}`;

    console.log(`Room created: ${roomId} by user ${req.user.email}`);

    res.status(201).json({
      message: 'Room created successfully',
      room: {
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        isPublic: room.isPublic,
        maxParticipants: room.maxParticipants,
        currentParticipants: room.currentParticipants,
        createdAt: room.createdAt,
        shareableLink,
      },
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Error creating room', error: error.message });
  }
});

// POST /api/rooms/join - Join a room
router.post('/join', joinRoomValidation, handleValidationErrors, async (req, res) => {
  try {
    const { roomId, name, password } = req.body;
    const userId = req.user?._id || null; // Allow guests

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.status !== 'active') {
      return res.status(400).json({ message: 'Room is not active' });
    }

    if (room.currentParticipants >= room.maxParticipants) {
      return res.status(400).json({ message: 'Room is full' });
    }

    // Check password for private rooms
    if (room.password && password) {
      const isPasswordValid = await bcrypt.compare(password, room.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid room password' });
      }
    } else if (room.password && !password) {
      return res.status(401).json({ message: 'Password required for this room' });
    }

    // Check if guests are allowed
    if (!userId && !room.settings.allowGuests) {
      return res.status(401).json({ message: 'Guests are not allowed in this room' });
    }

    await room.addParticipant(userId, name);

    console.log(`User ${name} joined room ${roomId}`);

    res.status(200).json({
      message: 'Successfully joined room',
      room: {
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        participants: room.participants.filter(p => p.isActive),
        settings: room.settings,
        canvasData: room.canvasData,
      },
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ message: 'Error joining room', error: error.message });
  }
});

// GET /api/rooms/:roomId - Get room details
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId })
      .populate('createdBy', 'name email')
      .lean();

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Don't return password in response
    const { password, ...roomData } = room;

    res.status(200).json({
      room: {
        ...roomData,
        requiresPassword: !!room.password,
        shareableLink: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/room/${roomId}`,
      },
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ message: 'Error fetching room', error: error.message });
  }
});

// GET /api/rooms - Get user's rooms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status = 'active' } = req.query;

    const rooms = await Room.find({ 
      createdBy: userId,
      status: status 
    })
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Room.countDocuments({ createdBy: userId, status });

    res.status(200).json({
      rooms: rooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        isPublic: room.isPublic,
        currentParticipants: room.currentParticipants,
        maxParticipants: room.maxParticipants,
        lastActivity: room.lastActivity,
        createdAt: room.createdAt,
        shareableLink: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/room/${room.roomId}`,
      })),
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Error fetching rooms', error: error.message });
  }
});

// PUT /api/rooms/:roomId - Update room settings
router.put('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Only room creator can update settings
    if (room.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only room creator can update settings' });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'maxParticipants', 'settings'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'settings') {
          room.settings = { ...room.settings, ...updates.settings };
        } else {
          room[field] = updates[field];
        }
      }
    });

    await room.updateActivity();
    await room.save();

    console.log(`Room ${roomId} updated by user ${req.user.email}`);

    res.status(200).json({
      message: 'Room updated successfully',
      room: {
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        settings: room.settings,
        maxParticipants: room.maxParticipants,
      },
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: 'Error updating room', error: error.message });
  }
});

// DELETE /api/rooms/:roomId - Delete/End room
router.delete('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Only room creator can delete room
    if (room.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only room creator can delete room' });
    }

    room.status = 'ended';
    await room.save();

    console.log(`Room ${roomId} ended by user ${req.user.email}`);

    res.status(200).json({ message: 'Room ended successfully' });
  } catch (error) {
    console.error('Error ending room:', error);
    res.status(500).json({ message: 'Error ending room', error: error.message });
  }
});

export default router;
