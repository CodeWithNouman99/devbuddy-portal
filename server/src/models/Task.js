// One onboarding task (T1..T7), one per day. Created by the seed script.
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      match: [/^T[1-7]$/, 'taskId must be T1 to T7'],
    },
    day: { type: Number, required: true, min: 1, max: 7 },
    // "All" means every developer role gets this task.
    role: { type: String, default: 'All' },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
