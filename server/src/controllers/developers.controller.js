// List, create and view developers.
const { matchedData } = require('express-validator');
const { Developer, Progress, Task, Question, User } = require('../models');
const audit = require('../utils/audit');
const { notifyNewDeveloper } = require('../services/n8n');
const { STUCK_AFTER_MS, isStuck, progressStatus, dayStates, dayState } = require('../utils/onboarding');

const PAGE_SIZE = 10;
const DUPLICATE_NUMBER = 'This WhatsApp number is already registered.';
const WELCOME_FAILED = 'Developer saved, but the WhatsApp welcome could not be sent.';

// Makes user input safe to use inside a regular expression
// (so searching for "a.b" doesn't treat "." as "any character").
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Managers may only see developers they manage. Everyone else sees all.
function canView(user, developer) {
  if (user.role !== 'manager') return true;
  const managerId = developer.manager?._id ?? developer.manager;
  return Boolean(managerId && managerId.equals(user._id));
}

// GET /api/developers?q=&role=&status=&page=
async function listDevelopers(req, res) {
  const { q, role, status, page = 1 } = matchedData(req, { locations: ['query'] });

  // 1. Filters MongoDB can apply directly
  const match = {};
  if (req.user.role === 'manager') match.manager = req.user._id; // managers: own developers only
  if (role) match.role = role;
  if (q) {
    const or = [{ name: { $regex: escapeRegex(q), $options: 'i' } }];
    // If the search contains digits, also search the number.
    // A leading 0 is dropped because numbers are stored as 92300..., not 0300...
    const digits = q.replace(/\D/g, '').replace(/^0+/, '');
    if (digits.length >= 3) or.push({ whatsappNumber: { $regex: digits } });
    match.$or = or;
  }

  // 2. "Stuck" depends on the Progress collection, so we use an aggregation
  //    pipeline: a list of steps MongoDB runs one after the other.
  //    (The same rule is written in JS in utils/onboarding.js; keep them in sync.)
  const stuckIfAssignedBefore = new Date(Date.now() - STUCK_AFTER_MS);

  const pipeline = [
    { $match: match },
    // Attach all Progress rows of each developer as an array "progress"
    {
      $lookup: {
        from: Progress.collection.name,
        localField: '_id',
        foreignField: 'developer',
        as: 'progress',
      },
    },
    // Pick the Progress row for the developer's current day
    {
      $addFields: {
        currentProgress: {
          $first: { $filter: { input: '$progress', cond: { $eq: ['$$this.day', '$currentDay'] } } },
        },
      },
    },
    // Work out the status pill value
    {
      $addFields: {
        progressStatus: {
          $switch: {
            branches: [
              { case: { $eq: ['$status', 'completed'] }, then: 'completed' },
              {
                case: {
                  $and: [
                    { $eq: ['$currentProgress.status', 'pending'] },
                    { $lt: ['$currentProgress.assignedAt', stuckIfAssignedBefore] },
                  ],
                },
                then: 'stuck',
              },
            ],
            default: 'on_track',
          },
        },
      },
    },
  ];

  if (status) pipeline.push({ $match: { progressStatus: status } });

  // 3. Sort, then get one page of results AND the total count in one query
  pipeline.push(
    { $sort: { joinDate: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          // Attach the manager's name (only _id and name, nothing secret)
          {
            $lookup: {
              from: User.collection.name,
              localField: 'manager',
              foreignField: '_id',
              as: 'managerDoc',
              pipeline: [{ $project: { name: 1 } }],
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    }
  );

  const [result] = await Developer.aggregate(pipeline);
  const total = result.total[0]?.count ?? 0;

  const items = result.items.map((dev) => ({
    _id: dev._id,
    name: dev.name,
    whatsappNumber: dev.whatsappNumber,
    role: dev.role,
    joinDate: dev.joinDate,
    currentDay: dev.currentDay,
    manager: dev.managerDoc[0] || null,
    isDemo: Boolean(dev.isDemo),
    progressStatus: dev.progressStatus,
    days: dayStates(dev, dev.progress, dev.progressStatus === 'stuck'),
  }));

  res.json({
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

// POST /api/developers
async function createDeveloper(req, res) {
  // matchedData = only the validated + cleaned fields (number already cleaned)
  const { name, whatsappNumber, role, joinDate, manager: managerId } = matchedData(req, { locations: ['body'] });

  // The manager must be a real user with the "manager" role
  let manager = null;
  if (managerId) {
    manager = await User.findOne({ _id: managerId, role: 'manager' });
    if (!manager) {
      return res.status(400).json({ message: 'Choose a valid manager.' });
    }
  }

  if (await Developer.exists({ whatsappNumber })) {
    return res.status(409).json({ message: DUPLICATE_NUMBER });
  }

  let developer;
  try {
    developer = await Developer.create({
      name,
      whatsappNumber,
      role,
      joinDate,
      manager: manager?._id,
      currentDay: 1,
      status: 'active',
      createdBy: req.user._id,
    });
  } catch (err) {
    // 11000 = unique index violation. Covers two people adding the same
    // number at the same moment (both passed the check above).
    if (err.code === 11000) return res.status(409).json({ message: DUPLICATE_NUMBER });
    throw err;
  }

  // Day 1 task starts now
  await Progress.create({ developer: developer._id, taskId: 'T1', day: 1, status: 'pending' });

  await audit({
    user: req.user._id,
    action: 'developer_created',
    details: { developerId: developer._id, name, whatsappNumber, role },
    ip: req.ip,
  });

  // Tell n8n to send the WhatsApp welcome. If it fails, the developer stays saved.
  const welcome = await notifyNewDeveloper(developer, manager);
  if (!welcome.ok) {
    await audit({
      user: req.user._id,
      action: 'welcome_webhook_failed',
      details: { developerId: developer._id, error: welcome.error },
      ip: req.ip,
    });
  }

  res.status(201).json({
    developer,
    welcomeSent: welcome.ok,
    warning: welcome.ok ? null : WELCOME_FAILED,
  });
}

// GET /api/developers/:id
async function getDeveloper(req, res) {
  const developer = await Developer.findById(req.params.id).populate('manager', 'name email');

  // Same answer for "doesn't exist" and "not yours", so managers can't
  // discover which IDs belong to other teams.
  if (!developer || !canView(req.user, developer)) {
    return res.status(404).json({ message: 'Developer not found.' });
  }

  const [progress, tasks, questions] = await Promise.all([
    Progress.find({ developer: developer._id }).lean(),
    Task.find({ role: { $in: ['All', developer.role] } }).sort({ day: 1 }).lean(),
    Question.find({ developer: developer._id }).sort({ askedAt: -1 }).lean(),
  ]);

  const currentProgress = progress.find((p) => p.day === developer.currentDay);
  const stuck = isStuck(developer, currentProgress);

  // One entry per task, combined with that day's progress (if any)
  const timeline = tasks.map((task) => {
    const p = progress.find((row) => row.taskId === task.taskId);
    return {
      day: task.day,
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      state: dayState(task.day, developer, p, stuck),
      assignedAt: p?.assignedAt ?? null,
      completedAt: p?.completedAt ?? null,
    };
  });

  res.json({
    developer: {
      ...developer.toJSON(),
      progressStatus: progressStatus(developer, stuck),
      days: dayStates(developer, progress, stuck),
    },
    timeline,
    questions,
  });
}

module.exports = { listDevelopers, createDeveloper, getDeveloper };
