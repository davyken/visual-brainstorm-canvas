import express from 'express';
import Message from '../schemas/messageSchema.js';

const router = express.Router();

// Get chat messages for a room/session
router.get('/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const messages = await Message.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('userId', 'username avatar');
    
    res.json(messages.reverse().map(msg => ({
      id: msg._id.toString(),
      userId: msg.userId?._id?.toString() || msg.userId,
      username: msg.userId?.username || msg.username || 'Anonymous',
      avatar: msg.userId?.avatar,
      message: msg.content,
      timestamp: msg.createdAt.toISOString(),
      roomId: msg.sessionId.toString(),
      type: msg.type,
      replyTo: msg.replyTo,
      reactions: msg.reactions,
    })));
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message to a room
router.post('/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, type = 'text', userId, username, replyTo } = req.body;
    
    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const newMessage = new Message({
      content: message.trim(),
      type,
      userId: userId || 'anonymous',
      username: username || 'Anonymous',
      sessionId,
      replyTo,
    });
    
    await newMessage.save();
    
    // Populate user info for response
    await newMessage.populate('userId', 'username avatar');
    
    const messageResponse = {
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
    
    res.json(messageResponse);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add/remove reaction to a message
router.post('/messages/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, action, userId } = req.body; // action: 'add' or 'remove'
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (!message.reactions) {
      message.reactions = {};
    }
    
    if (action === 'add') {
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = [];
      }
      if (!message.reactions[emoji].includes(userId)) {
        message.reactions[emoji].push(userId);
      }
    } else if (action === 'remove') {
      if (message.reactions[emoji]) {
        message.reactions[emoji] = message.reactions[emoji].filter(id => id !== userId);
        if (message.reactions[emoji].length === 0) {
          delete message.reactions[emoji];
        }
      }
    }
    
    message.markModified('reactions');
    await message.save();
    
    res.json({ 
      success: true, 
      reactions: message.reactions 
    });
  } catch (error) {
    console.error('Error updating reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat participants for a session
router.get('/:sessionId/participants', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId).populate('participants.userId', 'username avatar');
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      participants: session.participants.map(p => ({
        id: p.userId._id.toString(),
        username: p.userId.username,
        avatar: p.userId.avatar,
        role: p.role,
        joinedAt: p.joinedAt,
        isOnline: false, // This would be updated via socket events
      }))
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
