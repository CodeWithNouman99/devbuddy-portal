// Protects /api/bot. n8n is a server, not a browser, so it has no login
// cookie. Instead it proves who it is by sending the shared secret in the
// "x-devbuddy-secret" header.
const crypto = require('crypto');
const { n8nWebhookSecret } = require('../config/env');

// Hash both values first so they're always the same length (32 bytes):
// timingSafeEqual throws if the lengths differ, and comparing lengths
// directly would leak how long the real secret is.
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest();
}

// A normal "a === b" stops at the first different character, so a wrong guess
// that starts correctly takes a tiny bit longer. Measured many times, that
// could reveal the secret letter by letter. timingSafeEqual always takes the
// same time.
function secretsMatch(given, expected) {
  return crypto.timingSafeEqual(sha256(given), sha256(expected));
}

function requireBotSecret(req, res, next) {
  // No secret configured = bot API switched off. Never accept an empty secret.
  if (!n8nWebhookSecret) {
    console.error('Bot API called but N8N_WEBHOOK_SECRET is not set; rejecting.');
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const given = req.get('x-devbuddy-secret') || '';
  if (!secretsMatch(given, n8nWebhookSecret)) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  next();
}

module.exports = { requireBotSecret };
