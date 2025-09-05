import mongoose from 'mongoose';

const shapeSchema = new mongoose.Schema({
  _id: {
    type: String, // Allow string IDs for easier frontend integration
  },
  type: {
    type: String,
    required: true,
    enum: ['rect', 'circle', 'line', 'text', 'image'],
  },
  x: {
    type: Number,
    required: false,
  },
  y: {
    type: Number,
    required: false,
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
  points: [{
    type: Number,
  }],
  fill: {
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
  fontSize: {
    type: Number,
    required: false,
  },
  fontFamily: {
    type: String,
    required: false,
  },
  imageSrc: {
    type: String,
    required: false,
  },
  draggable: {
    type: Boolean,
    default: true,
  },
  tool: {
    type: String,
    required: false,
    enum: ['brush', 'eraser'],
  },
  fromId: {
    type: String,
    required: false,
  },
  toId: {
    type: String,
    required: false,
  },
  sessionId: {
    type: String, // Reference to session by string ID
    required: true,
  },
  createdBy: {
    type: String, // Socket ID or user identifier
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

shapeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Shape = mongoose.model('Shape', shapeSchema);
export default Shape;
