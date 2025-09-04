import mongoose from 'mongoose';

const shapeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['rectangle', 'circle', 'ellipse', 'line', 'arrow', 'text', 'image'],
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  width: {
    type: Number,
    required: false,
  },
  height: {
    type: Number,
    required: false,
  },
  radius: {
    type: Number,
    required: false,
  },
  color: {
    type: String,
    required: false,
  },
  stroke: {
    type: String,
    required: false,
  },
  strokeWidth: {
    type: Number,
    required: false,
  },
  text: {
    type: String,
    required: false,
  },
  imageUrl: {
    type: String,
    required: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Shape = mongoose.model('Shape', shapeSchema);
export default Shape;
