import Room from '../schemas/roomSchema.js';
import Canvas from '../schemas/canvasSchema.js';

export default function handleCanvas(io, socket) {
  console.log('Canvas socket connected:', socket.id);
  
  // Join a room for canvas collaboration
  socket.on('join-room', async (data) => {
    const { roomId, userId, username } = data;
    console.log(`User ${username} (${userId}) joining room: ${roomId}`);
    
    try {
      // Find the room
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Check if room requires password (handled in frontend before socket connection)
      if (room.requiresPassword && !room.participants.some(p => p.userId === userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }
      
      // Join socket room
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.username = username;
      
      // Add user to room participants if not already there
      const existingParticipant = room.participants.find(p => p.userId === userId);
      if (!existingParticipant) {
        room.addParticipant(userId, username, 'editor');
        await room.save();
      }
      
      // Get or create canvas for this room
      let canvas = await Canvas.findOne({ roomId });
      if (!canvas) {
        canvas = new Canvas({
          canvasId: Canvas.generateCanvasId(),
          roomId,
          name: `${room.name} Canvas`,
        });
        await canvas.save();
      }
      
      // Send current canvas state to the joining user
      socket.emit('canvas-state', {
        canvasId: canvas.canvasId,
        shapes: canvas.shapes,
        settings: canvas.settings,
        version: canvas.version
      });
      
      // Notify other users in the room
      socket.to(roomId).emit('user-joined', {
        userId,
        username,
        socketId: socket.id
      });
      
      console.log(`User ${username} successfully joined room ${roomId}`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle adding new shapes to canvas
  socket.on('add-shape', async (data) => {
    try {
      const { roomId, shape } = data;
      
      if (socket.roomId !== roomId) {
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }
      
      // Find the canvas
      const canvas = await Canvas.findOne({ roomId });
      if (!canvas) {
        socket.emit('error', { message: 'Canvas not found' });
        return;
      }
      
      // Add creator info to shape
      const newShape = {
        ...shape,
        createdBy: socket.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add shape to canvas
      await canvas.addShape(newShape);
      
      // Broadcast to all users in the room
      io.to(roomId).emit('shape-added', {
        shape: newShape,
        canvasVersion: canvas.version,
        addedBy: socket.username
      });
      
      console.log(`Shape added to room ${roomId} by ${socket.username}`);
      
    } catch (error) {
      console.error('Error adding shape:', error);
      socket.emit('error', { message: 'Failed to add shape' });
    }
  });

  // Handle updating existing shapes
  socket.on('update-shape', async (data) => {
    try {
      const { roomId, shapeId, updates } = data;
      
      if (socket.roomId !== roomId) {
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }
      
      const canvas = await Canvas.findOne({ roomId });
      if (!canvas) {
        socket.emit('error', { message: 'Canvas not found' });
        return;
      }
      
      // Update the shape
      await canvas.updateShape(shapeId, {
        ...updates,
        updatedAt: new Date()
      });
      
      // Broadcast to all users in the room
      io.to(roomId).emit('shape-updated', {
        shapeId,
        updates,
        canvasVersion: canvas.version,
        updatedBy: socket.username
      });
      
      console.log(`Shape ${shapeId} updated in room ${roomId} by ${socket.username}`);
      
    } catch (error) {
      console.error('Error updating shape:', error);
      socket.emit('error', { message: 'Failed to update shape' });
    }
  });

  // Handle deleting shapes
  socket.on('delete-shape', async (data) => {
    try {
      const { roomId, shapeId } = data;
      
      if (socket.roomId !== roomId) {
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }
      
      const canvas = await Canvas.findOne({ roomId });
      if (!canvas) {
        socket.emit('error', { message: 'Canvas not found' });
        return;
      }
      
      // Remove the shape
      await canvas.removeShape(shapeId);
      
      // Broadcast to all users in the room
      io.to(roomId).emit('shape-deleted', {
        shapeId,
        canvasVersion: canvas.version,
        deletedBy: socket.username
      });
      
      console.log(`Shape ${shapeId} deleted from room ${roomId} by ${socket.username}`);
      
    } catch (error) {
      console.error('Error deleting shape:', error);
      socket.emit('error', { message: 'Failed to delete shape' });
    }
  });

  // Handle canvas settings updates
  socket.on('update-canvas-settings', async (data) => {
    try {
      const { roomId, settings } = data;
      
      if (socket.roomId !== roomId) {
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }
      
      const canvas = await Canvas.findOne({ roomId });
      if (!canvas) {
        socket.emit('error', { message: 'Canvas not found' });
        return;
      }
      
      // Update canvas settings
      canvas.settings = { ...canvas.settings, ...settings };
      canvas.lastModified = new Date();
      canvas.modifiedBy = socket.userId;
      await canvas.save();
      
      // Broadcast to all users in the room
      io.to(roomId).emit('canvas-settings-updated', {
        settings: canvas.settings,
        updatedBy: socket.username
      });
      
      console.log(`Canvas settings updated in room ${roomId} by ${socket.username}`);
      
    } catch (error) {
      console.error('Error updating canvas settings:', error);
      socket.emit('error', { message: 'Failed to update canvas settings' });
    }
  });

  // Handle user leaving the room
  socket.on('leave-room', async () => {
    if (socket.roomId) {
      try {
        // Notify other users
        socket.to(socket.roomId).emit('user-left', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id
        });
        
        // Leave the socket room
        socket.leave(socket.roomId);
        
        console.log(`User ${socket.username} left room ${socket.roomId}`);
        
        // Clear socket data
        socket.roomId = null;
        socket.userId = null;
        socket.username = null;
        
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Canvas socket disconnected:', socket.id);
    
    if (socket.roomId) {
      // Notify other users in the room
      socket.to(socket.roomId).emit('user-left', {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id
      });
      
      console.log(`User ${socket.username} disconnected from room ${socket.roomId}`);
    }
  });

  // Handle cursor/pointer movement for real-time collaboration
  socket.on('cursor-move', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('cursor-moved', {
        userId: socket.userId,
        username: socket.username,
        x: data.x,
        y: data.y
      });
    }
  });
}
