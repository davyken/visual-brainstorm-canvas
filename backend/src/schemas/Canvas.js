import mongoose from 'mongoose';

const CanvasSchema = new mongoose.Schema({
  canvasId: {
    type: String,
    required: true,
    unique: true,
  },
  shareableLink: {
    type: String,
    required: true,
    unique: true,
  },
  strokes: {
    type: Array,
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Canvas', CanvasSchema);