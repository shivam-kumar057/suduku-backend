require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { connectDb, isDbConnected } = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const matchRoutes = require('./routes/matchRoutes');
const { initGameSocket } = require('./sockets/gameSocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
  },
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'sudoku-backend',
    database: isDbConnected() ? 'connected' : 'disconnected',
  });
});

app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/matches', matchRoutes);

initGameSocket(io);

const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI;
const DB_RETRY_DELAY_MS = 5000;

async function connectDbWithRetry() {
  if (!mongoUri) {
    // eslint-disable-next-line no-console
    console.error('Missing MONGODB_URI in env. Add it in Render Environment variables.');
    return;
  }

  const connected = await connectDb(mongoUri);

  if (!connected) {
    // eslint-disable-next-line no-console
    console.log(`Retrying MongoDB connection in ${DB_RETRY_DELAY_MS / 1000}s...`);
    setTimeout(connectDbWithRetry, DB_RETRY_DELAY_MS);
  }
}

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running at http://localhost:${port}`);
});

connectDbWithRetry();
