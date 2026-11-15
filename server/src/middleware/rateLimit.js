// Limits how often one IP address can call the login route.
// This slows down password-guessing bots, even across many different emails.
// (The per-account lockout lives in the auth controller.)
const { rateLimit } = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // max 10 login attempts per IP in that window
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many login attempts from this network. Please try again in 15 minutes.' },
});

// For /api/bot. n8n calls from one server, so this is generous for normal
// traffic (several WhatsApp messages a second) but stops someone hammering
// the endpoint to guess the secret. It runs BEFORE the secret check.
const botLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // max 120 requests per IP per minute
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests. Slow down and try again in a minute.' },
});

module.exports = { loginLimiter, botLimiter };
