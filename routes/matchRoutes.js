const express = require('express');
const Match = require('../models/Match');

const router = express.Router();

router.get('/:matchId', async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId).lean();
    if (!match) return res.status(404).json({ message: 'Match not found' });
    return res.json({ match });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

