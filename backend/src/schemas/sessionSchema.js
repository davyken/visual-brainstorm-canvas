
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  participants: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
      joinedAt: { type: Date, default: Date.now },
    }
  ],
  shapes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shape',
  }],
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
