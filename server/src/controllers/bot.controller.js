// Endpoints the n8n WhatsApp workflow calls. See routes/bot.routes.js.
const { matchedData } = require('express-validator');
const { Developer, Progress, Task, Question } = require('../models');
const audit = require('../utils/audit');

// GET /api/bot/context?phone=923001234567
// "Who is texting us, and what should they be working on?"
async function getContext(req, res) {
  const { phone } = matchedData(req, { locations: ['query'] }); // already cleaned

  const developer = await Developer.findOne({ whatsappNumber: phone }).lean();
  if (!developer) {
    return res.json({ registered: false, developer: null, pendingTask: null });
  }

  // Their open task. If several are pending, the earliest day comes first.
  const progress = await Progress.findOne({ developer: developer._id, status: 'pending' }).sort({ day: 1 }).lean();
  const task = progress ? await Task.findOne({ taskId: progress.taskId }).lean() : null;

  res.json({
    registered: true,
    developer: {
      id: developer._id,
      name: developer.name,
      role: developer.role,
      currentDay: developer.currentDay,
      status: developer.status,
    },
    pendingTask: progress
      ? {
          progressId: progress._id,
          taskId: progress.taskId,
          day: progress.day,
          title: task?.title ?? progress.taskId,
          description: task?.description ?? '',
        }
      : null,
  });
}

// POST /api/bot/tasks/complete   body { progressId }
async function completeTask(req, res) {
  const { progressId } = matchedData(req, { locations: ['body'] });

  // Find AND update in one step, but only if it's still pending. If n8n sends
  // the same request twice at once, only one of them can succeed.
  const progress = await Progress.findOneAndUpdate(
    { _id: progressId, status: 'pending' },
    { status: 'done', completedAt: new Date() },
    { returnDocument: 'after' }
  );

  if (!progress) {
    // Nothing updated: either it doesn't exist or it was already done.
    const exists = await Progress.exists({ _id: progressId });
    return exists
      ? res.status(409).json({ message: 'This task is already marked as done.' })
      : res.status(404).json({ message: 'Task progress not found.' });
  }

  const task = await Task.findOne({ taskId: progress.taskId }).lean();

  await audit({
    user: null, // done by the bot, not a signed-in person
    action: 'bot.task_completed',
    details: { progressId: progress._id, developerId: progress.developer, taskId: progress.taskId, day: progress.day },
    ip: req.ip,
  });

  res.json({ ok: true, taskTitle: task?.title ?? progress.taskId, day: progress.day });
}

// POST /api/bot/questions   body { developerId, question, answer, foundInDocs }
async function saveQuestion(req, res) {
  const { developerId, question, answer = '', foundInDocs } = matchedData(req, { locations: ['body'] });

  if (!(await Developer.exists({ _id: developerId }))) {
    return res.status(404).json({ message: 'Developer not found.' });
  }

  const saved = await Question.create({
    developer: developerId,
    question,
    answer,
    foundInDocs,
    resolved: false, // a human marks it resolved later
  });

  await audit({
    user: null,
    action: 'bot.question_saved',
    details: { questionId: saved._id, developerId, foundInDocs },
    ip: req.ip,
  });

  res.status(201).json({ ok: true });
}

module.exports = { getContext, completeTask, saveQuestion };
