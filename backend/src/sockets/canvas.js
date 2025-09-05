import Shape from '../schemas/shapeSchema.js';
import Session from '../schemas/sessionSchema.js';

export default function handleCanvas(io, socket) {
  console.log('Canvas socket connected:', socket.id);
  
  // Join a canvas session/room
  socket.on('join', async (data) => {
    const { sessionId, userId, username } = data;
    console.log(`User ${username} (${userId}) joining session: ${sessionId}`);
    
    try {
      // Join socket room
      socket.join(sessionId);
      socket.sessionId = sessionId;
      socket.userId = userId;
      socket.username = username;
      
      // Find or create session
      let session = await Session.findById(sessionId);
      if (!session) {
        session = new Session({
          _id: sessionId,
          title: `Canvas ${new Date().toISOString().split('T')[0]}`,
          description: '',
          ownerId: userId,
          isPrivate: false,
        });
        await session.save();
      }
      
      // Add user to participants if not already there
      const existingParticipant = session.participants.find(p => p.userId.toString() === userId);
      if (!existingParticipant) {
        session.participants.push({
          userId,
          role: session.ownerId === userId ? 'owner' : 'editor',
          joinedAt: new Date(),
        });
        await session.save();
      }
      
      // Load existing shapes for this session
      const shapes = await Shape.find({ sessionId }).sort({ createdAt: 1 });
      
      // Send existing shapes to the newly joined user
      socket.emit('canvas_loaded', {
        shapes: shapes.map(shape => ({
          id: shape._id.toString(),
          type: shape.type,
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          radius: shape.radius,
          points: shape.points,
          fill: shape.fill,
          stroke: shape.stroke,
          strokeWidth: shape.strokeWidth,
          text: shape.text,
          fontSize: shape.fontSize,
          fontFamily: shape.fontFamily,
          imageSrc: shape.imageSrc,
          draggable: shape.draggable,
          tool: shape.tool,
          fromId: shape.fromId,
          toId: shape.toId,
          createdBy: shape.createdBy,
        }))
      });
      
      // Notify others in the room
      socket.to(sessionId).emit('userJoined', {
        userId,
        username,
        socketId: socket.id,
      });
      
      console.log(`User ${username} successfully joined session ${sessionId}`);
      
    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });
  
  // Handle shape creation
  socket.on('shape_add', async (data) => {
    const { sessionId, shape, userId } = data;
    
    try {
      // Save shape to database
      const newShape = new Shape({
        ...shape,
        _id: shape.id,
        sessionId,
        createdBy: userId || socket.userId,
      });
      
      await newShape.save();
      
      // Broadcast to all users in the session except sender
      socket.to(sessionId).emit('shape_added', {
        shape: {
          id: newShape._id.toString(),
          type: newShape.type,
          x: newShape.x,
          y: newShape.y,
          width: newShape.width,
          height: newShape.height,
          radius: newShape.radius,
          points: newShape.points,
          fill: newShape.fill,
          stroke: newShape.stroke,
          strokeWidth: newShape.strokeWidth,
          text: newShape.text,
          fontSize: newShape.fontSize,
          fontFamily: newShape.fontFamily,
          imageSrc: newShape.imageSrc,
          draggable: newShape.draggable,
          tool: newShape.tool,
          fromId: newShape.fromId,
          toId: newShape.toId,
          createdBy: newShape.createdBy,
        },
        userId
      });
      
      console.log(`Shape ${shape.id} added to session ${sessionId}`);
      
    } catch (error) {
      console.error('Error adding shape:', error);
      socket.emit('error', { message: 'Failed to add shape' });
    }
  });
  
  // Handle shape updates
  socket.on('shape_update', async (data) => {
    const { sessionId, shapes, userId } = data;
    
    try {
      // Update shapes in database
      const updatePromises = shapes.map(async (shape) => {
        await Shape.findByIdAndUpdate(
          shape.id,
          {
            ...shape,
            sessionId,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      });
      
      await Promise.all(updatePromises);
      
      // Broadcast to all users in the session except sender
      socket.to(sessionId).emit('shape_updated', {
        shapes: shapes.map(shape => ({
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          radius: shape.radius,
          points: shape.points,
          fill: shape.fill,
          stroke: shape.stroke,
          strokeWidth: shape.strokeWidth,
          text: shape.text,
          fontSize: shape.fontSize,
          fontFamily: shape.fontFamily,
          imageSrc: shape.imageSrc,
          draggable: shape.draggable,
          tool: shape.tool,
          fromId: shape.fromId,
          toId: shape.toId,
        })),
        userId
      });
      
      console.log(`${shapes.length} shapes updated in session ${sessionId}`);
      
    } catch (error) {
      console.error('Error updating shapes:', error);
      socket.emit('error', { message: 'Failed to update shapes' });
    }
  });
  
  // Handle shape deletion
  socket.on('shape_delete', async (data) => {
    const { sessionId, shapeIds, userId } = data;
    
    try {
      // Delete shapes from database
      await Shape.deleteMany({
        _id: { $in: shapeIds },
        sessionId
      });
      
      // Broadcast to all users in the session except sender
      socket.to(sessionId).emit('shape_deleted', {
        shapeIds,
        userId
      });
      
      console.log(`${shapeIds.length} shapes deleted from session ${sessionId}`);
      
    } catch (error) {
      console.error('Error deleting shapes:', error);
      socket.emit('error', { message: 'Failed to delete shapes' });
    }
  });
  
  // Handle cursor/presence updates
  socket.on('cursor_move', (data) => {
    const { sessionId, x, y, userId, username } = data;
    socket.to(sessionId).emit('cursor_moved', {
      userId,
      username,
      x,
      y,
      socketId: socket.id,
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.sessionId) {
      socket.to(socket.sessionId).emit('userLeft', {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id,
      });
      
      console.log(`User ${socket.username} (${socket.userId}) left session ${socket.sessionId}`);
    }
    
    console.log('Canvas socket disconnected:', socket.id);
  });
}
