const express = require('express');
const { getGlobalLeaderboard, getWeeklyLeaderboard } = require('../services/leaderboardService');

const router = express.Router();

router.get('/global', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const entries = await getGlobalLeaderboard(limit);
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/weekly', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const data = await getWeeklyLeaderboard(limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

