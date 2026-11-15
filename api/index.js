// Vercel serverless entry point: serves the Express API under /api.
// Locally the API still runs from server/src/server.js (npm run dev in server/).
// Here there is no app.listen: Vercel calls this handler for each request.
// (Packages like express and mongoose live in server/node_modules and are
// loaded through server/src, so this file only requires server code.)
const connectDB = require('../server/src/config/db');
const app = require('../server/src/app');

// A warm function instance is reused between requests, so connect to MongoDB
// once and share the same connection. If connecting fails, the next request
// tries again instead of reusing a failed attempt.
let connection = null;

function ensureDB() {
  if (!connection) {
    connection = connectDB().catch((err) => {
      connection = null;
      throw err;
    });
  }
  return connection;
}

module.exports = async (req, res) => {
  try {
    await ensureDB();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Database unavailable. Please try again shortly.' }));
    return;
  }
  return app(req, res);
};
