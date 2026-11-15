// Builds the Express app: security middleware, routes, error handling.
// Kept separate from server.js so it can be tested without starting a server.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { clientUrl, trustProxy } = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const developerRoutes = require('./routes/developers.routes');
const userRoutes = require('./routes/users.routes');
const botRoutes = require('./routes/bot.routes');
const statsRoutes = require('./routes/stats.routes');
const questionRoutes = require('./routes/questions.routes');
const auditRoutes = require('./routes/audit.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind a hosting proxy, this makes req.ip the real visitor IP
// (needed for the rate limiter and audit logs).
app.set('trust proxy', trustProxy);

// Sets many safe HTTP headers (no sniffing, no framing, etc.)
app.use(helmet());

// Only our React app may call this API from a browser, with cookies.
app.use(cors({ origin: clientUrl, credentials: true }));

// Parse JSON bodies. Bot requests may carry long AI answers, so they get a
// bigger limit; everything else stays small. (The first parser that reads a
// body wins, so the bot one must come before the general one.)
app.use('/api/bot', express.json({ limit: '100kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/bot', botRoutes); // n8n only: secret header, no cookie

// Must come last
app.use(notFound);
app.use(errorHandler);

module.exports = app;
