// A staff member who logs in to DevBuddy (Admin, HR or Manager).
const mongoose = require('mongoose');
const { cleanWhatsappNumber } = require('../utils/phone');

const ROLES = ['admin', 'hr', 'manager'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true, // creates a unique index in MongoDB
      lowercase: true, // "Ali@Company.com" is stored as "ali@company.com"
      trim: true,
    },
    // We never store the real password, only its bcrypt hash.
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    // Optional WhatsApp number, used for managers: n8n sends them alerts and
    // the weekly report. The setter cleans it exactly like developer numbers
    // ("0300-1234567" is saved as "923001234567"), wherever it is set from.
    managerPhone: {
      type: String,
      set: (value) => (value == null || value === '' ? undefined : cleanWhatsappNumber(value)),
      match: [/^\d{10,15}$/, 'Phone must be 10-15 digits, e.g. 923001234567'],
    },

    // Lockout fields: see controllers/auth.controller.js
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },

    // Deactivated users can't sign in, and any open session stops working.
    // Set from the Team & roles page (admin only).
    active: { type: Boolean, default: true },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// True while the account is locked after too many failed logins.
userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

// When a user is turned into JSON (e.g. res.json(user)), hide secret fields.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.failedLogins;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
