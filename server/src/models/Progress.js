// Tracks whether a developer has finished a given task.
const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer', required: true },
  taskId: { type: String, required: true }, // "T1".."T7", matches Task.taskId
  day: { type: Number, required: true, min: 1, max: 7 },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  assignedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
});

// A developer can only have one progress row per task.
progressSchema.index({ developer: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
