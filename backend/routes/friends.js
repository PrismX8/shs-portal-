const express = require('express');
const router = express.Router();
const { Friend, UserProfile, FriendRequest } = require('../database/models');

// Store io instance (set by server.js)
let ioInstance = null;

// Function to set io instance
function setIO(io) {
  ioInstance = io;
}

// Helper to find socket by visitorId
function findSocketByVisitorId(visitorId) {
  if (!ioInstance) return null;
  return Array.from(ioInstance.sockets.sockets.values())
    .find(s => s.visitorId === visitorId);
}

// Add a friend
router.post('/', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    if (!userId || !friendId) {
      return res.status(400).json({ error: 'User ID and Friend ID are required' });
    }
    await Friend.add(userId, friendId);
    
    // Emit socket events for real-time updates
    if (ioInstance) {
      const userSocket = findSocketByVisitorId(userId);
      const friendSocket = findSocketByVisitorId(friendId);
      
      if (userSocket) {
        userSocket.emit('friend:added', { userId, friendId });
      }
      if (friendSocket) {
        friendSocket.emit('friend:added', { userId: friendId, friendId: userId });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// Remove a friend
router.delete('/', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    if (!userId || !friendId) {
      return res.status(400).json({ error: 'User ID and Friend ID are required' });
    }
    await Friend.remove(userId, friendId);
    
    // Emit socket events for real-time updates
    if (ioInstance) {
      const userSocket = findSocketByVisitorId(userId);
      const friendSocket = findSocketByVisitorId(friendId);
      
      if (userSocket) {
        userSocket.emit('friend:removed', { userId, friendId });
      }
      if (friendSocket) {
        friendSocket.emit('friend:removed', { userId: friendId, friendId: userId });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const profile = await UserProfile.get(req.params.userId);
    res.json(profile || null);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Set user profile
router.post('/profile', async (req, res) => {
  try {
    const { userId, profile } = req.body;
    if (!userId || !profile) {
      return res.status(400).json({ error: 'User ID and profile are required' });
    }
    await UserProfile.set(userId, profile);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting profile:', error);
    res.status(500).json({ error: 'Failed to set profile' });
  }
});

// Get all profiles (for search)
router.get('/profiles/all', async (req, res) => {
  try {
    const profiles = await UserProfile.getAll();
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching all profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Friend requests
router.get('/requests/:userId', async (req, res) => {
  try {
    const requests = await FriendRequest.getForUser(req.params.userId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

router.post('/requests/send', async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ error: 'fromUserId and toUserId are required' });
    }
    await FriendRequest.remove(fromUserId, toUserId);
    await FriendRequest.add(fromUserId, toUserId, 'pending', Date.now());
    if (ioInstance) {
      const senderSocket = findSocketByVisitorId(fromUserId);
      const recipientSocket = findSocketByVisitorId(toUserId);
      if (recipientSocket) {
        recipientSocket.emit('friend:request:received', { fromUserId, toUserId });
      }
      if (senderSocket) {
        senderSocket.emit('friend:request:sent', { fromUserId, toUserId });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

router.post('/requests/accept', async (req, res) => {
  try {
    const { userId, requesterId } = req.body;
    if (!userId || !requesterId) {
      return res.status(400).json({ error: 'userId and requesterId are required' });
    }
    await FriendRequest.setStatus(requesterId, userId, 'accepted');
    await FriendRequest.remove(requesterId, userId);
    await Friend.add(userId, requesterId);
    await Friend.add(requesterId, userId);
    if (ioInstance) {
      const userSocket = findSocketByVisitorId(userId);
      const requesterSocket = findSocketByVisitorId(requesterId);
      if (userSocket) {
        userSocket.emit('friend:request:accepted', { userId, requesterId });
      }
      if (requesterSocket) {
        requesterSocket.emit('friend:request:accepted', { userId, requesterId });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

router.post('/requests/decline', async (req, res) => {
  try {
    const { userId, requesterId } = req.body;
    if (!userId || !requesterId) {
      return res.status(400).json({ error: 'userId and requesterId are required' });
    }
    await FriendRequest.setStatus(requesterId, userId, 'declined');
    await FriendRequest.remove(requesterId, userId);
    if (ioInstance) {
      const userSocket = findSocketByVisitorId(userId);
      const requesterSocket = findSocketByVisitorId(requesterId);
      if (userSocket) {
        userSocket.emit('friend:request:declined', { userId, requesterId });
      }
      if (requesterSocket) {
        requesterSocket.emit('friend:request:declined', { userId, requesterId });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

router.post('/requests/remove', async (req, res) => {
  try {
    const { userA, userB } = req.body;
    if (!userA || !userB) {
      return res.status(400).json({ error: 'userA and userB are required' });
    }
    await FriendRequest.remove(userA, userB);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend request:', error);
    res.status(500).json({ error: 'Failed to remove friend request' });
  }
});

// Get all friends for a user (keep last to avoid routing collisions)
router.get('/:userId', async (req, res) => {
  try {
    const friends = await Friend.getAll(req.params.userId);
    res.json(friends);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

module.exports = { router, setIO };

