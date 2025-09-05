
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  _id: {
    type: String, // Allow string IDs for easier demo usage
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: false,
    trim: true,
  },
  ownerId: {
    type: String, // Allow string user IDs for demo
    required: true,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  participants: [
    {
      userId: { type: String, required: true },
      role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
      joinedAt: { type: Date, default: Date.now },
    }
  ],
  shapes: [{
    type: String, // Reference to shape IDs
  }],
}, { 
  timestamps: true,
  _id: false // Disable automatic ObjectId generation
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;
