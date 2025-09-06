// Initialize all database schemas
// This ensures all models are registered with Mongoose

import User from './userSchema.js';
import Canvas from './canvasSchema.js';
import Room from './roomSchema.js';

// Optional: You can add any schema initialization logic here
console.log('Database schemas initialized:');
console.log('- User model ready');
console.log('- Canvas model ready');
console.log('- Room model ready');

export { User, Canvas, Room };
