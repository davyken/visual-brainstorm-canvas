import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  password: {
    type: String,
    default: null, // For private rooms
  },
  maxParticipants: {
    type: Number,
    default: 50,
  },
  currentParticipants: {
    type: Number,
    default: 0,
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  canvasData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  settings: {
    allowGuests: {
      type: Boolean,
      default: true,
    },
    allowDrawing: {
      type: Boolean,
      default: true,
    },
    allowChat: {
      type: Boolean,
      default: true,
    },
    autoSave: {
      type: Boolean,
      default: true,
    },
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'ended'],
    default: 'active',
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  },
});

// Index for efficient queries
roomSchema.index({ createdBy: 1, createdAt: -1 });
roomSchema.index({ lastActivity: -1 });
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate a unique room ID
roomSchema.statics.generateRoomId = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 8; i++) {
    roomId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return roomId;
};

// Update last activity
roomSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Add participant to room
roomSchema.methods.addParticipant = function(userId, name) {
  const existingParticipant = this.participants.find(p => 
    p.userId && p.userId.toString() === userId
  );
  
  if (existingParticipant) {
    existingParticipant.isActive = true;
    existingParticipant.joinedAt = new Date();
  } else {
    this.participants.push({
      userId: userId || null,
      name,
      joinedAt: new Date(),
      isActive: true,
    });
  }
  
  this.currentParticipants = this.participants.filter(p => p.isActive).length;
  this.updateActivity();
  return this.save();
};

// Remove participant from room
roomSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => 
    p.userId && p.userId.toString() === userId
  );
  
  if (participant) {
    participant.isActive = false;
  }
  
  this.currentParticipants = this.participants.filter(p => p.isActive).length;
  return this.save();
};

const Room = mongoose.model('Room', roomSchema);
export default Room;
