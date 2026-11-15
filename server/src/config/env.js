// Loads variables from server/.env into process.env and checks that the
// important ones exist. Every other file imports settings from here, so a
// missing value is caught once, at startup, with a clear message.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const required = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy server/.env.example to server/.env and fill them in.');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is too short. Use at least 32 random characters.');
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  isProduction: process.env.NODE_ENV === 'production',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL,
  cookieSecure: process.env.COOKIE_SECURE !== 'false', // secure unless explicitly turned off
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  // Optional: if the webhook URL is empty, developers are still saved but no
  // WhatsApp welcome is sent (the UI shows a warning).
  n8nNewDeveloperWebhook: process.env.N8N_NEW_DEVELOPER_WEBHOOK || '',
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || '',
};
