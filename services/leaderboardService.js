const User = require('../models/User');

function getWeekStartIso() {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - day + 1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

async function getGlobalLeaderboard(limit = 50) {
  const users = await User.find({})
    .select('name rating wins losses totalSolveSeconds totalSolved')
    .lean();

  const ranked = users
    .map(user => {
      const matches = user.wins + user.losses;
      const winRate = matches > 0 ? user.wins / matches : 0;
      const avgSolve = user.totalSolved > 0 ? user.totalSolveSeconds / user.totalSolved : 9999;
      const speedScore = Math.max(0, 3000 - avgSolve);
      const score = Math.round(winRate * 700 + speedScore * 0.1 + user.rating * 0.35);
      return {
        userId: user._id,
        name: user.name,
        score,
        rating: user.rating,
        winRate: Number(winRate.toFixed(3)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return ranked;
}

async function getWeeklyLeaderboard(limit = 50) {
  // MVP weekly board: same ranking logic with week metadata.
  const data = await getGlobalLeaderboard(limit);
  return {
    weekStart: getWeekStartIso(),
    entries: data,
  };
}

module.exports = {
  getGlobalLeaderboard,
  getWeeklyLeaderboard,
};

