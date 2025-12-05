const { v4: uuidv4 } = require('uuid');
const {
  ChatMessage,
  OnlineUser,
  VisitorStats,
  TypingIndicator,
  BannedUser,
  ModerationStats,
  PrivateChatMessage
} = require('../database/models');

// Store active socket connections
const activeConnections = new Map();

// Handle new connection
function handleConnection(socket, io) {
  const visitorId = socket.handshake.query.visitorId || `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const username = socket.handshake.query.username || 'Anonymous';
  
  // Client connected
  
  socket.visitorId = visitorId;
  socket.username = username;
  
  activeConnections.set(socket.id, { visitorId, username, socket });
  // Active connections tracked
  
  // Set user online
  OnlineUser.setOnline(visitorId, username).then(() => {
    // User set online
    // Get all online users to verify
    return OnlineUser.getAll();
  }).then(users => {
    // Total online users in DB
  }).catch(err => {
    console.error('Error setting user online:', err);
  });
  
  // Increment visitor count (only once per session)
  if (!socket.hasIncrementedVisitor) {
    VisitorStats.increment().catch(err => {
      console.error('Error incrementing visitor count:', err);
    });
    socket.hasIncrementedVisitor = true;
  }
  
  // Send initial data
  sendInitialData(socket, io);
  
  // Handle chat message
  socket.on('chat:send', async (data) => {
    try {
      // Check if user is banned
      const isBanned = await BannedUser.isBanned(visitorId);
      if (isBanned) {
        socket.emit('chat:error', { message: 'You are banned from chatting' });
        return;
      }
      
      const messageId = uuidv4();
      const messageData = {
        id: messageId,
        user: username,
        text: data.text,
        color: data.color || '#000000',
        time: Date.now(),
        uid: visitorId,
        avatar: data.avatar || '👤',
        avatarImage: data.avatarImage || null,
        reactions: {}
      };
      
      await ChatMessage.create(messageData);
      
      // Broadcast to all clients
      io.emit('chat:message', messageData);
      
      // Remove typing indicator
      await TypingIndicator.remove(visitorId);
      io.emit('chat:typing', await getTypingUsers());
    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });
  
  // Handle typing indicator
  socket.on('chat:typing', async () => {
    try {
      await TypingIndicator.set(visitorId, username);
      io.emit('chat:typing', await getTypingUsers());
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  });
  
  // Handle stop typing
  socket.on('chat:stop-typing', async () => {
    try {
      await TypingIndicator.remove(visitorId);
      io.emit('chat:typing', await getTypingUsers());
    } catch (error) {
      console.error('Error removing typing indicator:', error);
    }
  });
  
  // Handle message reaction
  socket.on('chat:reaction', async (data) => {
    try {
      const { messageId, emoji } = data;
      
      // Get current message
      const messages = await ChatMessage.getRecent(1000);
      const message = messages.find(m => m.id === messageId);
      
      if (!message) {
        return;
      }
      
      const reactions = message.reactions || {};
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      
      await ChatMessage.updateReactions(messageId, reactions);
      
      // Broadcast updated reactions
      io.emit('chat:reaction', { messageId, reactions });
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  });
  
  // Handle canvas stroke
  socket.on('canvas:stroke', async (data) => {
    try {
      const { id, strokeData } = data;
      console.log('[Backend] Received canvas stroke:', id, 'from visitor:', socket.visitorId, 'type:', strokeData?.type || 'path');
      if (id && strokeData) {
        // Broadcast immediately to all other clients for real-time sync
        console.log('[Backend] Broadcasting stroke to other clients:', id, 'clients:', io.sockets.sockets.size);
        socket.broadcast.emit('canvas:stroke', { id, strokeData });
        console.log('[Backend] Stroke broadcast complete:', id);
        
        // Store in database asynchronously (don't block real-time updates)
        const Canvas = require('../database/models').Canvas;
        Canvas.addStroke(id, strokeData).catch(err => {
          console.error('[Backend] Error saving canvas stroke to DB:', err);
        });
      } else {
        console.warn('[Backend] Invalid canvas stroke data:', { id: !!id, strokeData: !!strokeData });
      }
    } catch (error) {
      console.error('[Backend] Error handling canvas stroke:', error);
    }
  });
  
  // Handle canvas clear
  socket.on('canvas:clear', async (data) => {
    try {
      const Canvas = require('../database/models').Canvas;
      await Canvas.clear();
      
      // Broadcast to all clients
      io.emit('canvas:clear', data);
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  });

  // Handle canvas cursor updates
  socket.on('canvas:cursor', (data) => {
    try {
      const { userId, cursorData } = data;
      console.log('[Backend] Received canvas cursor:', userId, 'x:', cursorData?.x, 'y:', cursorData?.y);
      if (userId && cursorData) {
        // Broadcast cursor update to all other clients
        // Keep cursorData nested as frontend expects { userId, cursorData }
        console.log('[Backend] Broadcasting cursor to other clients:', userId);
        socket.broadcast.emit('canvas:cursor', { userId, cursorData });
      } else {
        console.warn('[Backend] Invalid cursor data:', { userId: !!userId, cursorData: !!cursorData });
      }
    } catch (error) {
      console.error('[Backend] Error handling canvas cursor:', error);
    }
  });

  // Handle canvas cursor removal
  socket.on('canvas:cursor:remove', (data) => {
    try {
      const { userId } = data;
      if (userId) {
        // Broadcast cursor removal to all other clients
        socket.broadcast.emit('canvas:cursor:remove', { userId });
      }
    } catch (error) {
      console.error('Error handling canvas cursor removal:', error);
    }
  });

  // Handle private chat messages
  socket.on('private:send', async (data) => {
    try {
      const { chatId, from, to, fromName, text, timestamp } = data || {};
      if (!chatId || !from || !to || !text) {
        return;
      }
      const message = {
        id: uuidv4(),
        chat_id: chatId,
        from_user: from,
        to_user: to,
        from_name: fromName || 'User',
        text,
        timestamp: timestamp || Date.now()
      };
      await PrivateChatMessage.add(message);
      // Emit to sender and receiver if connected
      socket.emit('private:message', message);
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.visitorId === to);
      if (targetSocket) {
        targetSocket.emit('private:message', message);
      }
    } catch (error) {
      console.error('Error handling private message:', error);
    }
  });
  
  // Update online users periodically
  setInterval(async () => {
    try {
      const onlineUsers = await OnlineUser.getAll();
      // Periodic update of online users
      io.emit('visitors:online', onlineUsers);
      
      const totalVisitors = await VisitorStats.get();
      io.emit('visitors:total', { totalVisitors });
    } catch (error) {
      console.error('Error updating online users:', error);
    }
  }, 5000); // Update every 5 seconds
  
  // Cleanup typing indicators periodically
  setInterval(async () => {
    try {
      await TypingIndicator.cleanup();
    } catch (error) {
      console.error('Error cleaning up typing indicators:', error);
    }
  }, 10000); // Cleanup every 10 seconds
  
  // Handle friend request
  socket.on('friend:request', async (data) => {
    try {
      const { fromUserId, toUserId } = data;
      if (fromUserId && toUserId) {
        // Notify the recipient
        const recipientSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.visitorId === toUserId);
        if (recipientSocket) {
          recipientSocket.emit('friend:request:received', { fromUserId, toUserId });
        }
        // Also notify sender
        socket.emit('friend:request:sent', { fromUserId, toUserId });
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  });
  
  // Handle friend added
  socket.on('friend:added', async (data) => {
    try {
      const { userId, friendId } = data;
      if (userId && friendId) {
        // Notify both users
        const userSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.visitorId === userId);
        const friendSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.visitorId === friendId);
        
        if (userSocket) {
          userSocket.emit('friend:added', { userId, friendId });
        }
        if (friendSocket) {
          friendSocket.emit('friend:added', { userId: friendId, friendId: userId });
        }
      }
    } catch (error) {
      console.error('Error handling friend added:', error);
    }
  });
  
  // Handle friend removed
  socket.on('friend:removed', async (data) => {
    try {
      const { userId, friendId } = data;
      if (userId && friendId) {
        // Notify both users
        const userSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.visitorId === userId);
        const friendSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.visitorId === friendId);
        
        if (userSocket) {
          userSocket.emit('friend:removed', { userId, friendId });
        }
        if (friendSocket) {
          friendSocket.emit('friend:removed', { userId: friendId, friendId: userId });
        }
      }
    } catch (error) {
      console.error('Error handling friend removed:', error);
    }
  });
}

// Handle disconnection
async function handleDisconnect(socket, io) {
  const connection = activeConnections.get(socket.id);
  if (connection) {
    const { visitorId } = connection;
    
    // Set user offline
    await OnlineUser.setOffline(visitorId).catch(err => {
      console.error('Error setting user offline:', err);
    });
    
    // Remove typing indicator
    await TypingIndicator.remove(visitorId).catch(err => {
      console.error('Error removing typing indicator:', err);
    });
    
    // Broadcast updated typing indicators
    getTypingUsers().then(users => {
      io.emit('chat:typing', users);
    }).catch(err => {
      console.error('Error getting typing users:', err);
    });
    
    activeConnections.delete(socket.id);
  }
}

// Send initial data to newly connected client
async function sendInitialData(socket, io) {
  try {
    // Send recent chat messages
    const messages = await ChatMessage.getRecent(50);
    socket.emit('chat:initial', messages);
    
    // Send online users
    const onlineUsers = await OnlineUser.getAll();
    socket.emit('visitors:online', onlineUsers);
    
    // Send total visitors
    const totalVisitors = await VisitorStats.get();
    socket.emit('visitors:total', { totalVisitors });
    
    // Send typing indicators
    const typingUsers = await getTypingUsers();
    socket.emit('chat:typing', typingUsers);
  } catch (error) {
    console.error('Error sending initial data:', error);
  }
}

// Get current typing users
async function getTypingUsers() {
  try {
    const typing = await TypingIndicator.getAll();
    return typing.map(t => t.username);
  } catch (error) {
    console.error('Error getting typing users:', error);
    return [];
  }
}

module.exports = {
  handleConnection,
  handleDisconnect
};

