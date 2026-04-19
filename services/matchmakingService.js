const User = require('../models/User');
const Match = require('../models/Match');
const { generateSudoku } = require('./sudokuService');

const queue = [];

function removeFromQueue(userId) {
  const index = queue.findIndex(entry => entry.userId === String(userId));
  if (index >= 0) queue.splice(index, 1);
}

function findBestCandidate(player) {
  if (queue.length === 0) return null;
  const now = Date.now();

  // Prefer close ratings.
  const close = queue
    .filter(entry => Math.abs(entry.rating - player.rating) <= 150)
    .sort((a, b) => Math.abs(a.rating - player.rating) - Math.abs(b.rating - player.rating));

  if (close.length > 0) return close[0];

  // If player waited enough, pick nearest rating anyway.
  const waitedMs = now - player.joinedAt;
  if (waitedMs >= 10000) {
    return [...queue].sort((a, b) => {
      const aGap = Math.abs(a.rating - player.rating);
      const bGap = Math.abs(b.rating - player.rating);
      return aGap - bGap;
    })[0];
  }
  return null;
}

async function joinQueue({ userId, socketId, difficulty = 'medium', mode = 'realtime' }) {
  removeFromQueue(userId);
  const user = await User.findById(userId).lean();
  if (!user) throw new Error('User not found');

  const player = {
    userId: String(user._id),
    socketId,
    name: user.name,
    rating: user.rating,
    difficulty,
    mode,
    joinedAt: Date.now(),
  };

  const candidate = findBestCandidate(player);
  if (!candidate) {
    queue.push(player);
    return { waiting: true };
  }

  removeFromQueue(candidate.userId);
  const matchDifficulty = player.difficulty || candidate.difficulty || 'medium';
  const { puzzle, solution } = generateSudoku(matchDifficulty);

  const match = await Match.create({
    difficulty: matchDifficulty,
    mode,
    players: [
      {
        userId: player.userId,
        name: player.name,
        rating: player.rating,
      },
      {
        userId: candidate.userId,
        name: candidate.name,
        rating: candidate.rating,
      },
    ],
    puzzle,
    solution,
    status: 'active',
    startedAt: new Date(),
  });

  return {
    waiting: false,
    match,
    players: [player, candidate],
  };
}

module.exports = {
  queue,
  joinQueue,
  removeFromQueue,
};

