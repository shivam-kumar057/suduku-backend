const mongoose = require('mongoose');

const DailyChallengeSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    puzzle: { type: [[Number]], required: true },
    solution: { type: [[Number]], required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('DailyChallenge', DailyChallengeSchema);

