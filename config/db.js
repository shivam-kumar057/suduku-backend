const mongoose = require('mongoose');

async function connectDb(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection failed:', error.message);
    return false;
  }
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDb, isDbConnected };
