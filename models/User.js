const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
    deviceId: { type: String, required: true, unique: true, index: true },
    coins: { type: Number, default: 100, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 1000, min: 100 },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    totalMatches: { type: Number, default: 0, min: 0 },
    totalSolved: { type: Number, default: 0, min: 0 },
    totalSolveSeconds: { type: Number, default: 0, min: 0 },
    lastDailyChallengeAt: { type: Date, default: null },
    dailyBestTimes: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', UserSchema);

