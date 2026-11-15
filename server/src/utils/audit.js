// Helper to write an AuditLog entry.
const AuditLog = require('../models/AuditLog');

async function audit({ user = null, action, details = {}, ip = '' }) {
  try {
    await AuditLog.create({ user, action, details, ip });
  } catch (err) {
    // Failing to write a log should never break the request itself.
    console.error('Could not write audit log:', err.message);
  }
}

module.exports = audit;
