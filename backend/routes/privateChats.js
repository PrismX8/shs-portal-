const express = require('express');
const router = express.Router();
const { PrivateChatMessage } = require('../database/models');
const { v4: uuidv4 } = require('uuid');

// Get messages for a chatId (sorted oldest->newest)
router.get('/:chatId/messages', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const messages = await PrivateChatMessage.getByChat(chatId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching private chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Post a new message
router.post('/:chatId/messages', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const { from, to, fromName, text, timestamp } = req.body;
    if (!from || !to || !text) {
      return res.status(400).json({ error: 'from, to, and text are required' });
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
    res.json(message);
  } catch (error) {
    console.error('Error saving private chat message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

module.exports = router;
