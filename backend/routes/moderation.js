const express = require('express');
const router = express.Router();
const {
  BannedUser,
  ModerationSettings,
  ProfanityWord,
  ModerationStats
} = require('../database/models');

// Get all banned users
router.get('/banned', async (req, res) => {
  try {
    const banned = await BannedUser.getAll();
    res.json(banned);
  } catch (error) {
    console.error('Error fetching banned users:', error);
    res.status(500).json({ error: 'Failed to fetch banned users' });
  }
});

// Check if user is banned
router.get('/banned/:uid', async (req, res) => {
  try {
    const isBanned = await BannedUser.isBanned(req.params.uid);
    res.json({ banned: isBanned });
  } catch (error) {
    console.error('Error checking banned user:', error);
    res.status(500).json({ error: 'Failed to check banned status' });
  }
});

// Ban a user
router.post('/banned', async (req, res) => {
  try {
    const { uid, username, reason, banned_by, expires_at } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const banned_at = Date.now();
    await BannedUser.create({
      uid,
      username: username || 'Unknown',
      reason: reason || 'No reason provided',
      banned_by: banned_by || 'System',
      banned_at,
      expires_at: expires_at || null
    });
    
    // Update stats
    const stats = await ModerationStats.get();
    stats.banned_users = (stats.banned_users || 0) + 1;
    await ModerationStats.update(stats);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban a user
router.delete('/banned/:uid', async (req, res) => {
  try {
    await BannedUser.remove(req.params.uid);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Get moderation settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await ModerationSettings.getAll();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching moderation settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get a specific setting
router.get('/settings/:key', async (req, res) => {
  try {
    const value = await ModerationSettings.get(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Set moderation setting
router.post('/settings/:key', async (req, res) => {
  try {
    await ModerationSettings.set(req.params.key, req.body.value);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting moderation setting:', error);
    res.status(500).json({ error: 'Failed to set setting' });
  }
});

// Get profanity words
router.get('/profanity', async (req, res) => {
  try {
    const words = await ProfanityWord.getAll();
    res.json(words);
  } catch (error) {
    console.error('Error fetching profanity words:', error);
    res.status(500).json({ error: 'Failed to fetch profanity words' });
  }
});

// Add profanity word
router.post('/profanity', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }
    await ProfanityWord.add(word);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding profanity word:', error);
    res.status(500).json({ error: 'Failed to add word' });
  }
});

// Remove profanity word
router.delete('/profanity/:word', async (req, res) => {
  try {
    await ProfanityWord.remove(req.params.word);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing profanity word:', error);
    res.status(500).json({ error: 'Failed to remove word' });
  }
});

// Set all profanity words
router.post('/profanity/set-all', async (req, res) => {
  try {
    const { words } = req.body;
    if (!Array.isArray(words)) {
      return res.status(400).json({ error: 'Words must be an array' });
    }
    await ProfanityWord.setAll(words);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting profanity words:', error);
    res.status(500).json({ error: 'Failed to set words' });
  }
});

// Get moderation stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await ModerationStats.get();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Update moderation stats
router.post('/stats', async (req, res) => {
  try {
    await ModerationStats.update(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating moderation stats:', error);
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

module.exports = router;

