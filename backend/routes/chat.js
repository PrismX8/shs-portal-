const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { ChatMessage, BannedUser } = require('../database/models');

// Public: get recent chat messages (chronological)
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);
    const includeImages = req.query.images === '1' || req.query.includeImages === '1';
    const messages = await ChatMessage.getRecent(limit);
    // Optionally strip avatarImage to reduce payload for faster preload
    const result = includeImages
      ? messages
      : messages.map(m => {
          const { avatarImage, ...rest } = m;
          return rest;
        });
    res.json(result);
  } catch (error) {
    console.error('Error fetching recent chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// Public: chat leaderboard (top chatters)
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10) || 10, 1), 50);
    const rows = await ChatMessage.getTopChatters(limit);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching chat leaderboard:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch leaderboard', detail: error?.message || 'unknown' });
  }
});

// Public: send a chat message (polling-friendly, no websockets required)
router.post('/send', async (req, res) => {
  try {
    const { user, text, color, uid, avatar, avatarImage } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Message text required' });
    }

    const visitorId = uid || `visitor_${Date.now()}`;
    const username = (user || 'Anonymous').toString().slice(0, 80);

    // Block banned users
    const isBanned = await BannedUser.isBanned(visitorId);
    if (isBanned) {
      return res.status(403).json({ error: 'Banned' });
    }

    const message = {
      id: uuidv4(),
      user: username,
      text: text.toString().slice(0, 2000),
      color: color || '#000000',
      time: Date.now(),
      uid: visitorId,
      avatar: avatar || 'dY`',
      avatarImage: avatarImage || null,
      reactions: {}
    };

    await ChatMessage.create(message);
    res.json(message);
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Public: add a reaction via REST
router.post('/reaction', async (req, res) => {
  try {
    const { messageId, emoji } = req.body || {};
    if (!messageId || !emoji) {
      return res.status(400).json({ error: 'messageId and emoji required' });
    }
    const message = await ChatMessage.getById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    const reactions = message.reactions || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    await ChatMessage.updateReactions(messageId, reactions);
    res.json({ messageId, reactions });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

module.exports = router;
