// A permanent record of important actions (logins, lockouts, later: edits).
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Optional: a failed login with an unknown email has no user.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true }, // e.g. "login_success"
    details: { type: mongoose.Schema.Types.Mixed, default: {} }, // any extra info
    ip: { type: String, default: '' },
  },
  // Only createdAt: audit entries are never edited.
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
