import Message from '../schemas/messageSchema.js';
import Session from '../schemas/sessionSchema.js';

export default function handleChat(io, socket) {
  console.log('Chat socket connected:', socket.id);
  
  // Join a chat room
  socket.on('join_chat', async (data) => {
    const { roomId, userId, username } = data;
    console.log(`User ${username} (${userId}) joining chat room: ${roomId}`);
    
    try {
      // Join socket room
      socket.join(roomId);
      socket.chatRoomId = roomId;
      socket.chatUserId = userId;
      socket.chatUsername = username;
      
      // Verify session exists
      const session = await Session.findById(roomId);
      if (!session) {
        socket.emit('error', { message: 'Chat room not found' });
        return;
      }
      
      // Notify others in the room
      socket.to(roomId).emit('user_joined_chat', {
        userId,
        username,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
      
      // Send recent messages to the newly joined user
      const recentMessages = await Message.find({ sessionId: roomId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('userId', 'username avatar');
      
      socket.emit('chat_history', {
        messages: recentMessages.reverse().map(msg => ({
          id: msg._id.toString(),
          userId: msg.userId?._id?.toString() || msg.userId,
          username: msg.userId?.username || msg.username,
          avatar: msg.userId?.avatar,
          message: msg.content,
          timestamp: msg.createdAt.toISOString(),
          roomId: msg.sessionId.toString(),
          type: msg.type,
          replyTo: msg.replyTo,
          reactions: msg.reactions,
        }))
      });
      
      console.log(`User ${username} successfully joined chat room ${roomId}`);
      
    } catch (error) {
      console.error('Error joining chat room:', error);
      socket.emit('error', { message: 'Failed to join chat room' });
    }
  });
  
  // Handle chat message
  socket.on('chat_message', async (data) => {
    const { id, message, type = 'text', roomId, replyTo } = data;
    const userId = socket.chatUserId;
    const username = socket.chatUsername;
    
    try {
      // Save message to database
      const newMessage = new Message({
        _id: id,
        content: message.trim(),
        type,
        userId,
        username,
        sessionId: roomId || socket.chatRoomId,
        replyTo,
      });
      
      await newMessage.save();
      
      // Populate user info for broadcast
      await newMessage.populate('userId', 'username avatar');
      
      const messageData = {
        id: newMessage._id.toString(),
        userId: newMessage.userId?._id?.toString() || newMessage.userId,
        username: newMessage.userId?.username || newMessage.username,
        avatar: newMessage.userId?.avatar,
        message: newMessage.content,
        timestamp: newMessage.createdAt.toISOString(),
        roomId: newMessage.sessionId.toString(),
        type: newMessage.type,
        replyTo: newMessage.replyTo,
        reactions: newMessage.reactions,
      };
      
      // Broadcast to all users in the room
      io.to(socket.chatRoomId).emit('message_received', messageData);
      
      console.log(`Message sent in room ${socket.chatRoomId} by ${username}`);
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle typing indicator
  socket.on('typing', (data) => {
    const { roomId, isTyping } = data;
    const userId = socket.chatUserId;
    const username = socket.chatUsername;
    
    socket.to(roomId || socket.chatRoomId).emit('user_typing', {
      userId,
      username,
      isTyping,
      socketId: socket.id,
    });
  });
  
  // Handle message reactions
  socket.on('message_reaction', async (data) => {
    const { messageId, emoji, action, roomId } = data; // action: 'add' or 'remove'
    const userId = socket.chatUserId;
    
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }
      
      if (!message.reactions) {
        message.reactions = new Map();
      }
      
      if (action === 'add') {
        const currentReactions = message.reactions.get(emoji) || [];
        if (!currentReactions.includes(userId)) {
          currentReactions.push(userId);
          message.reactions.set(emoji, currentReactions);
        }
      } else if (action === 'remove') {
        const currentReactions = message.reactions.get(emoji) || [];
        const updatedReactions = currentReactions.filter(id => id !== userId);
        if (updatedReactions.length === 0) {
          message.reactions.delete(emoji);
        } else {
          message.reactions.set(emoji, updatedReactions);
        }
      }
      
      message.markModified('reactions');
      await message.save();
      
      // Broadcast reaction update to all users in the room
      io.to(roomId || socket.chatRoomId).emit('message_reaction_updated', {
        messageId,
        reactions: Object.fromEntries(message.reactions),
      });
      
      console.log(`Reaction ${action} for message ${messageId} in room ${roomId || socket.chatRoomId}`);
      
    } catch (error) {
      console.error('Error updating reaction:', error);
      socket.emit('error', { message: 'Failed to update reaction' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.chatRoomId) {
      socket.to(socket.chatRoomId).emit('user_left_chat', {
        userId: socket.chatUserId,
        username: socket.chatUsername,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`User ${socket.chatUsername} (${socket.chatUserId}) left chat room ${socket.chatRoomId}`);
    }
    
    console.log('Chat socket disconnected:', socket.id);
  });
}
