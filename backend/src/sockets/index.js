import { Server } from 'socket.io';

export default function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // Adjust for production
    },
  });


  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);


    // Canvas update event handler
    socket.on('canvas:update', (updateData) => {
      socket.broadcast.emit('canvas:update', updateData);
    });

    // User joins a canvas/session
    socket.on('canvas:join', (data) => {
      socket.join(data.sessionId);
      socket.to(data.sessionId).emit('canvas:userJoined', { userId: data.userId });
    });

    // User leaves a canvas/session
    socket.on('canvas:leave', (data) => {
      socket.leave(data.sessionId);
      socket.to(data.sessionId).emit('canvas:userLeft', { userId: data.userId });
    });

    // Clear the canvas for all users
    socket.on('canvas:clear', (data) => {
      socket.to(data.sessionId).emit('canvas:clear', data);
    });

    // Undo last action
    socket.on('canvas:undo', (data) => {
      socket.to(data.sessionId).emit('canvas:undo', data);
    });

    // Redo last undone action
    socket.on('canvas:redo', (data) => {
      socket.to(data.sessionId).emit('canvas:redo', data);
    });

    // Select a shape/object
    socket.on('canvas:select', (data) => {
      socket.to(data.sessionId).emit('canvas:select', data);
    });

    // Delete a shape/object
    socket.on('canvas:delete', (data) => {
      socket.to(data.sessionId).emit('canvas:delete', data);
    });

    // Chat message within the session
    socket.on('canvas:chat', (data) => {
      socket.to(data.sessionId).emit('canvas:chat', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}
