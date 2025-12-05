const express = require('express');
const router = express.Router();
const { Canvas } = require('../database/models');

// Get all canvas strokes
router.get('/strokes', async (req, res) => {
  try {
    const strokes = await Canvas.getAllStrokes();
    res.json(strokes);
  } catch (error) {
    console.error('Error fetching canvas strokes:', error);
    res.status(500).json({ error: 'Failed to fetch strokes' });
  }
});

// Add a canvas stroke
router.post('/strokes', async (req, res) => {
  try {
    const { id, strokeData } = req.body;
    if (!id || !strokeData) {
      return res.status(400).json({ error: 'ID and stroke data are required' });
    }
    await Canvas.addStroke(id, strokeData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding canvas stroke:', error);
    res.status(500).json({ error: 'Failed to add stroke' });
  }
});

// Clear canvas
router.delete('/strokes', async (req, res) => {
  try {
    await Canvas.clear();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing canvas:', error);
    res.status(500).json({ error: 'Failed to clear canvas' });
  }
});

module.exports = router;

