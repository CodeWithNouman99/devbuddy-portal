// A new developer going through the 7-day onboarding.
// They do not log in to this app; they talk to DevBuddy over WhatsApp (n8n).
const mongoose = require('mongoose');

const DEV_ROLES = ['Frontend', 'Backend', 'Full Stack', 'QA', 'DevOps'];

const developerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    whatsappNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // Digits only with country code, no "+" or spaces. e.g. 923001234567
      match: [/^\d{10,15}$/, 'WhatsApp number must be 10-15 digits, e.g. 923001234567'],
    },
    role: { type: String, enum: DEV_ROLES, required: true },
    joinDate: { type: Date, default: Date.now },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentDay: { type: Number, min: 1, max: 7, default: 1 },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // When the morning job (POST /api/bot/daily/run) last handled this
    // developer. Used so running it twice on the same day does nothing.
    lastDailyRunAt: { type: Date, default: null },
    // Created by "npm run seed -- --demo". Shown in the web app with a "Demo"
    // tag, but the bot never sends WhatsApp messages about them.
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Developer', developerSchema);
module.exports.DEV_ROLES = DEV_ROLES;
