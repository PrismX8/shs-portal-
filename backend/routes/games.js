const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { GameRating, GameRatingSummary, GameReview, GameStat } = require('../database/models');

// Public: get rating summary for all games
router.get('/ratings', async (_req, res) => {
  try {
    const rows = await GameRatingSummary.getAll();
    // Return object keyed by game_id to mimic previous structure
    const map = {};
    rows.forEach(r => {
      map[r.game_id] = {
        average: r.average || 0,
        count: r.count || 0,
        total: r.total || 0
      };
    });
    res.json(map);
  } catch (error) {
    console.error('Error fetching game ratings:', error);
    res.status(500).json({ error: 'Failed to fetch game ratings' });
  }
});

// Public: get game stats (clicks, embeds, titles)
router.get('/stats', async (_req, res) => {
  try {
    const rows = await GameStat.getAll();
    const map = {};
    rows.forEach(r => {
      map[r.game_id] = {
        embed: r.embed,
        title: r.title,
        clicks: r.clicks,
        first_clicked: r.first_clicked,
        last_clicked: r.last_clicked
      };
    });
    res.json(map);
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
});

module.exports = router;

// --- Mutations for ratings/reviews (backend replacement for Firebase) ---

// Submit or update a rating for a game
router.post('/ratings', async (req, res) => {
  try {
    const { gameId, userId, rating } = req.body || {};
    if (!gameId || !userId || typeof rating !== 'number') {
      return res.status(400).json({ error: 'gameId, userId, rating required' });
    }
    // Store rating
    await GameRating.add(gameId, userId, rating);
    // Recompute summary
    const db = require('../database/db').getDb();
    const summary = await new Promise((resolve, reject) => {
      db.get(
        'SELECT AVG(rating) as average, COUNT(*) as count, SUM(rating) as total FROM game_ratings WHERE game_id = ?',
        [gameId],
        (err, row) => (err ? reject(err) : resolve(row || { average: 0, count: 0, total: 0 }))
      );
    });
    await GameRatingSummary.set(gameId, summary.average || 0, summary.count || 0, summary.total || 0);
    res.json({ gameId, ...summary });
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// Get rating summary for a single game
router.get('/ratings/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const db = require('../database/db').getDb();
    const summary = await new Promise((resolve, reject) => {
      db.get(
        'SELECT AVG(rating) as average, COUNT(*) as count, SUM(rating) as total FROM game_ratings WHERE game_id = ?',
        [gameId],
        (err, row) => (err ? reject(err) : resolve(row || { average: 0, count: 0, total: 0 }))
      );
    });
    res.json({ gameId, ...summary });
  } catch (error) {
    console.error('Error fetching rating:', error);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

// Submit a review for a game
router.post('/reviews', async (req, res) => {
  try {
    const { gameId, author, rating, text, userId } = req.body || {};
    if (!gameId || !author || typeof rating !== 'number' || !text) {
      return res.status(400).json({ error: 'gameId, author, rating, text required' });
    }
    const review = {
      id: uuidv4(),
      game_id: gameId,
      author,
      rating,
      text,
      user_id: userId || null,
      timestamp: Date.now()
    };
    await GameReview.add(review);
    res.json(review);
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// Get reviews for a game
router.get('/reviews/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const rows = await GameReview.getAll();
    const filtered = Array.isArray(rows) ? rows.filter(r => r.game_id === gameId) : [];
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});
