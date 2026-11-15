// Entry point: connect to MongoDB, then start listening for requests.
const { port } = require('./config/env'); // loads .env first
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  try {
    await connectDB();
    app.listen(port, () => console.log(`DevBuddy API running on http://localhost:${port}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
