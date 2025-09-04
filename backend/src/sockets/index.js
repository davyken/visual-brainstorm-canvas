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
      // Broadcast the update to all other clients
      socket.broadcast.emit('canvas:update', updateData);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}
