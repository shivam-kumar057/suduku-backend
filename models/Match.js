const mongoose = require('mongoose');

const MatchPlayerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    elapsedSeconds: { type: Number, default: null },
    mistakes: { type: Number, default: 0 },
    isCorrect: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
  },
  { _id: false },
);

const MatchSchema = new mongoose.Schema(
  {
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    mode: { type: String, enum: ['async', 'realtime'], default: 'realtime' },
    players: { type: [MatchPlayerSchema], validate: v => v.length === 2 },
    puzzle: { type: [[Number]], required: true },
    solution: { type: [[Number]], required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['waiting', 'active', 'finished'],
      default: 'active',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Match', MatchSchema);

