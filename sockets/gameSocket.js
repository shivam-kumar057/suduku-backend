const Match = require('../models/Match');
const User = require('../models/User');
const { isValidSubmittedGrid } = require('../services/sudokuService');
const { addCoins } = require('../services/coinService');
const { joinQueue, removeFromQueue } = require('../services/matchmakingService');

const socketUserMap = new Map();

function ratingDelta(playerRating, opponentRating, didWin) {
  const expected = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  const actual = didWin ? 1 : 0;
  return Math.round(24 * (actual - expected));
}

function initGameSocket(io) {
  io.on('connection', socket => {
    socket.on('join_queue', async payload => {
      try {
        const { userId, difficulty = 'medium', mode = 'realtime' } = payload || {};
        if (!userId) {
          socket.emit('queue_error', { message: 'userId is required' });
          return;
        }

        socketUserMap.set(socket.id, String(userId));
        const result = await joinQueue({
          userId,
          socketId: socket.id,
          difficulty,
          mode,
        });

        if (result.waiting) {
          socket.emit('queue_waiting', { message: 'Finding opponent...' });
          return;
        }

        const [playerA, playerB] = result.players;
        const match = result.match;

        const payloadForPlayers = player => ({
          matchId: String(match._id),
          difficulty: match.difficulty,
          puzzle: match.puzzle,
          startedAt: match.startedAt,
          opponent: {
            userId: player.userId === playerA.userId ? playerB.userId : playerA.userId,
            name: player.userId === playerA.userId ? playerB.name : playerA.name,
            rating: player.userId === playerA.userId ? playerB.rating : playerA.rating,
          },
        });

        io.to(playerA.socketId).emit('match_found', payloadForPlayers(playerA));
        io.to(playerB.socketId).emit('match_found', payloadForPlayers(playerB));
        io.to(playerA.socketId).emit('game_start', { matchId: String(match._id), timestamp: Date.now() });
        io.to(playerB.socketId).emit('game_start', { matchId: String(match._id), timestamp: Date.now() });
      } catch (error) {
        socket.emit('queue_error', { message: error.message });
      }
    });

    socket.on('leave_queue', () => {
      const userId = socketUserMap.get(socket.id);
      if (userId) removeFromQueue(userId);
      socket.emit('queue_left', { ok: true });
    });

    socket.on('submit_solution', async payload => {
      try {
        const { matchId, userId, solutionGrid, elapsedSeconds = 0, mistakes = 0 } = payload || {};
        if (!matchId || !userId || !solutionGrid) {
          socket.emit('game_result', { success: false, message: 'Invalid payload' });
          return;
        }

        const maxMistakes = Number(process.env.MAX_ALLOWED_MISTAKES || 12);
        const minSeconds = Number(process.env.UNREALISTIC_SOLVE_SECONDS || 15);
        if (elapsedSeconds < minSeconds) {
          socket.emit('game_result', {
            success: false,
            message: 'Submission rejected due to unrealistic solve time.',
          });
          return;
        }
        if (mistakes > maxMistakes) {
          socket.emit('game_result', {
            success: false,
            message: 'Submission rejected due to excessive mistakes.',
          });
          return;
        }

        const match = await Match.findById(matchId);
        if (!match || match.status !== 'active') {
          socket.emit('game_result', { success: false, message: 'Match not active' });
          return;
        }

        const isCorrect = isValidSubmittedGrid(solutionGrid, match.solution);
        const currentPlayer = match.players.find(p => String(p.userId) === String(userId));
        const opponentPlayer = match.players.find(p => String(p.userId) !== String(userId));
        if (!currentPlayer || !opponentPlayer) {
          socket.emit('game_result', { success: false, message: 'Player not found in match' });
          return;
        }

        currentPlayer.elapsedSeconds = elapsedSeconds;
        currentPlayer.mistakes = mistakes;
        currentPlayer.isCorrect = isCorrect;
        currentPlayer.submittedAt = new Date();

        if (!isCorrect) {
          await match.save();
          socket.emit('game_result', {
            success: false,
            status: 'retry',
            message: 'Incorrect solution, retry allowed.',
          });
          return;
        }

        // First correct submit wins for MVP.
        match.winner = currentPlayer.userId;
        match.status = 'finished';
        match.finishedAt = new Date();
        await match.save();

        const [winner, loser] = await Promise.all([
          User.findById(currentPlayer.userId),
          User.findById(opponentPlayer.userId),
        ]);

        if (winner && loser) {
          winner.wins += 1;
          winner.totalMatches += 1;
          winner.totalSolved += 1;
          winner.totalSolveSeconds += elapsedSeconds;
          loser.losses += 1;
          loser.totalMatches += 1;

          const winDelta = ratingDelta(winner.rating, loser.rating, true);
          const loseDelta = ratingDelta(loser.rating, winner.rating, false);
          winner.rating += winDelta;
          loser.rating += loseDelta;
          if (loser.rating < 100) loser.rating = 100;

          await Promise.all([
            addCoins(winner, 50, 'win', { matchId }),
            addCoins(loser, 10, 'loss', { matchId }),
          ]);
          await Promise.all([winner.save(), loser.save()]);
        }

        // Emit to every player socket currently connected for this match users.
        const resultPayload = {
          success: true,
          matchId,
          winnerId: String(currentPlayer.userId),
          stats: match.players,
        };
        io.emit('game_result', resultPayload);
      } catch (error) {
        socket.emit('game_result', { success: false, message: error.message });
      }
    });

    socket.on('disconnect', () => {
      const userId = socketUserMap.get(socket.id);
      if (userId) {
        removeFromQueue(userId);
        socketUserMap.delete(socket.id);
      }
    });
  });
}

module.exports = { initGameSocket };

