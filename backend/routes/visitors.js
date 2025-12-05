const express = require('express');
const router = express.Router();
const { VisitorStats, OnlineUser } = require('../database/models');

// Get total visitor count
router.get('/total', async (req, res) => {
  try {
    const count = await VisitorStats.get();
    res.json({ totalVisitors: count });
  } catch (error) {
    console.error('Error fetching visitor count:', error);
    res.status(500).json({ error: 'Failed to fetch visitor count' });
  }
});

// Increment visitor count
router.post('/increment', async (req, res) => {
  try {
    const count = await VisitorStats.increment();
    res.json({ totalVisitors: count });
  } catch (error) {
    console.error('Error incrementing visitor count:', error);
    res.status(500).json({ error: 'Failed to increment count' });
  }
});

// Set visitor count (admin)
router.post('/set', async (req, res) => {
  try {
    const { count } = req.body;
    if (typeof count !== 'number') {
      return res.status(400).json({ error: 'Count must be a number' });
    }
    await VisitorStats.set(count);
    res.json({ success: true, totalVisitors: count });
  } catch (error) {
    console.error('Error setting visitor count:', error);
    res.status(500).json({ error: 'Failed to set count' });
  }
});

// Get online users
router.get('/online', async (req, res) => {
  try {
    const users = await OnlineUser.getAll();
    res.json(users);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Mark user online (poll-friendly)
router.post('/online/ping', async (req, res) => {
  try {
    const { visitorId, username } = req.body || {};
    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId required' });
    }
    const safeName = (username || 'Anonymous').toString().slice(0, 80);
    await OnlineUser.setOnline(visitorId, safeName);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error setting user online:', error);
    res.status(500).json({ error: 'Failed to set online' });
  }
});

// Mark user offline
router.post('/online/offline', async (req, res) => {
  try {
    const { visitorId } = req.body || {};
    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId required' });
    }
    await OnlineUser.setOffline(visitorId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error setting user offline:', error);
    res.status(500).json({ error: 'Failed to set offline' });
  }
});

module.exports = router;

