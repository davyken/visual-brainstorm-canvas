import { Server } from 'socket.io';
import handleCanvas from './canvas.js';

export default function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // Explicitly allow frontend origin
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  // Canvas namespace
  const canvasNamespace = io.of('/canvas');
  canvasNamespace.on('connection', (socket) => {
    console.log('✅ Socket.IO: Client connected to /canvas namespace:', socket.id);
    handleCanvas(canvasNamespace, socket);
  });

  console.log('🚀 Socket.IO server setup complete');
  return io;
}
