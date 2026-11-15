// A question a developer asked DevBuddy (via WhatsApp) and the answer given.
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer', required: true },
  question: { type: String, required: true, trim: true },
  answer: { type: String, default: '' },
  // Did the AI find the answer in the company docs? If not, a human should follow up.
  foundInDocs: { type: Boolean, default: false },
  resolved: { type: Boolean, default: false },
  askedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Question', questionSchema);
