const Transaction = require('../models/Transaction');

async function addCoins(user, amount, type, meta = {}) {
  user.coins += amount;
  if (user.coins < 0) user.coins = 0;
  await user.save();

  await Transaction.create({
    userId: user._id,
    type,
    amount,
    meta,
  });

  return user.coins;
}

module.exports = { addCoins };

