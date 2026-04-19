const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const DailyChallenge = require('../models/DailyChallenge');
const { generateSudoku, isValidSubmittedGrid } = require('../services/sudokuService');
const { addCoins } = require('../services/coinService');

const router = express.Router();

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isYesterday(lastDate, todayDate) {
  const last = new Date(`${lastDate}T00:00:00.000Z`);
  const today = new Date(`${todayDate}T00:00:00.000Z`);
  const diff = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diff === 1;
}

router.post('/login', async (req, res) => {
  try {
    const { name, deviceId } = req.body;
    if (!name || !deviceId) {
      return res.status(400).json({ message: 'name and deviceId are required' });
    }

    const user = await User.findOneAndUpdate(
      { deviceId },
      { $set: { name } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/wallet/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('coins');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      balance: user.coins,
      transactions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/reward-coins', async (req, res) => {
  try {
    const { userId, amount = 20 } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await addCoins(user, Math.max(1, amount), 'reward', { source: 'rewarded_ad' });
    return res.json({ coins: user.coins });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/daily-challenge', async (_req, res) => {
  try {
    const date = formatDate();
    let challenge = await DailyChallenge.findOne({ date });
    if (!challenge) {
      const { puzzle, solution } = generateSudoku('medium');
      challenge = await DailyChallenge.create({
        date,
        difficulty: 'medium',
        puzzle,
        solution,
      });
    }
    return res.json({ challenge });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/daily-challenge/submit', async (req, res) => {
  try {
    const { userId, solutionGrid, elapsedSeconds = 0 } = req.body;
    const date = formatDate();

    const [user, challenge] = await Promise.all([
      User.findById(userId),
      DailyChallenge.findOne({ date }),
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!challenge) return res.status(404).json({ message: 'Daily challenge not found' });

    const isCorrect = isValidSubmittedGrid(solutionGrid, challenge.solution);
    if (!isCorrect) return res.status(400).json({ message: 'Incorrect solution' });

    const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const lastPlayed = user.lastDailyChallengeAt
      ? formatDate(new Date(user.lastDailyChallengeAt))
      : null;

    if (lastPlayed === date) {
      // same day: keep streak as-is
    } else if (lastPlayed === yesterday) {
      user.streak += 1;
    } else {
      user.streak = 1;
    }

    user.lastDailyChallengeAt = new Date();
    user.totalSolved += 1;
    user.totalSolveSeconds += elapsedSeconds;

    const currentBest = user.dailyBestTimes.get(date);
    if (!currentBest || elapsedSeconds < currentBest) {
      user.dailyBestTimes.set(date, elapsedSeconds);
    }

    let reward = 30;
    if (user.streak % 7 === 0) reward += 70;
    else if (user.streak % 3 === 0) reward += 25;

    await addCoins(user, reward, 'daily', { date, streak: user.streak });
    await user.save();

    return res.json({
      success: true,
      streak: user.streak,
      reward,
      coins: user.coins,
      bestTime: user.dailyBestTimes.get(date),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

