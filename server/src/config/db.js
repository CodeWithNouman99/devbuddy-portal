// Opens the connection to MongoDB Atlas.
const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectDB() {
  // Only allow fields that are defined in our schemas to be used in queries.
  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = connectDB;
