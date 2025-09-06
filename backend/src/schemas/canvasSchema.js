import mongoose from 'mongoose';

// Shape Schema - Individual drawing elements
const shapeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['rectangle', 'circle', 'line', 'text', 'freehand', 'arrow', 'polygon'],
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  dimensions: {
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  style: {
    fillColor: { type: String, default: '#ffffff' },
    strokeColor: { type: String, default: '#000000' },
    strokeWidth: { type: Number, default: 1 },
    opacity: { type: Number, default: 1, min: 0, max: 1 },
  },
  content: {
    text: { type: String, default: '' }, // For text elements
    fontSize: { type: Number, default: 16 },
    fontFamily: { type: String, default: 'Arial' },
  },
  path: [{
    x: Number,
    y: Number,
  }], // For freehand drawings and complex shapes
  rotation: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  createdBy: {
    type: String, // User ID or name
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
});

// Canvas Schema - The main drawing board
const canvasSchema = new mongoose.Schema({
  canvasId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  roomId: {
    type: String,
    required: true,
    ref: 'Room',
  },
  name: {
    type: String,
    default: 'Untitled Canvas',
  },
  settings: {
    background: {
      color: { type: String, default: '#ffffff' },
      pattern: { type: String, default: 'none' }, // 'none', 'grid', 'dots'
      patternSize: { type: Number, default: 20 },
    },
    viewport: {
      zoom: { type: Number, default: 1, min: 0.1, max: 10 },
      panX: { type: Number, default: 0 },
      panY: { type: Number, default: 0 },
    },
    dimensions: {
      width: { type: Number, default: 2000 },
      height: { type: Number, default: 1500 },
    },
    permissions: {
      allowDrawing: { type: Boolean, default: true },
      allowShapes: { type: Boolean, default: true },
      allowText: { type: Boolean, default: true },
      allowDelete: { type: Boolean, default: true },
    },
  },
  // All drawing elements stored as subdocuments
  shapes: [shapeSchema],
  
  // Canvas metadata
  version: {
    type: Number,
    default: 1,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  modifiedBy: {
    type: String, // Last user who modified
  },
  
  // For undo/redo functionality
  history: [{
    action: { type: String, required: true }, // 'create', 'update', 'delete'
    shapeId: String,
    timestamp: { type: Date, default: Date.now },
    userId: String,
    data: mongoose.Schema.Types.Mixed, // Previous state for undo
  }],
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for performance
canvasSchema.index({ roomId: 1 });
canvasSchema.index({ lastModified: -1 });
canvasSchema.index({ 'shapes.id': 1 });

// Generate unique canvas ID
canvasSchema.statics.generateCanvasId = function() {
  return 'canvas_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Add shape to canvas
canvasSchema.methods.addShape = function(shape) {
  shape.id = shape.id || this.constructor.generateShapeId();
  shape.updatedAt = new Date();
  this.shapes.push(shape);
  this.lastModified = new Date();
  this.version += 1;
  return this.save();
};

// Update shape on canvas
canvasSchema.methods.updateShape = function(shapeId, updates) {
  const shape = this.shapes.id(shapeId);
  if (shape) {
    Object.assign(shape, updates);
    shape.updatedAt = new Date();
    this.lastModified = new Date();
    this.version += 1;
    return this.save();
  }
  throw new Error('Shape not found');
};

// Remove shape from canvas
canvasSchema.methods.removeShape = function(shapeId) {
  const shape = this.shapes.id(shapeId);
  if (shape) {
    shape.remove();
    this.lastModified = new Date();
    this.version += 1;
    return this.save();
  }
  throw new Error('Shape not found');
};

// Generate unique shape ID
canvasSchema.statics.generateShapeId = function() {
  return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const Canvas = mongoose.model('Canvas', canvasSchema);
export default Canvas;
