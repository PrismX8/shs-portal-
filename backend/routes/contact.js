const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { ContactMessage } = require('../database/models');

// Create a new contact message
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const id = uuidv4();
    const timestamp = Date.now();
    const date = new Date().toISOString();
    
    await ContactMessage.create({
      id,
      name,
      email,
      subject,
      message,
      timestamp,
      date
    });
    
    res.json({ success: true, id, timestamp });
  } catch (error) {
    console.error('Error creating contact message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Get all contact messages (admin endpoint)
router.get('/', async (req, res) => {
  try {
    const messages = await ContactMessage.getAll();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get a specific contact message
router.get('/:id', async (req, res) => {
  try {
    const message = await ContactMessage.getById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(message);
  } catch (error) {
    console.error('Error fetching contact message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

module.exports = router;

