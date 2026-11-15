// Scheduled jobs n8n triggers: the 9:00 morning run and the weekly report.
const { matchedData } = require('express-validator');
const { Developer, Progress, Task, Question, User } = require('../models');
const audit = require('../utils/audit');
const { isStuck } = require('../utils/onboarding');
const { DAY_MS, karachiDate, startOfKarachiDay, karachiDaysBetween } = require('../utils/time');

// ---------------------------------------------------------------------------
// POST /api/bot/daily/run[?dryRun=true]
// ---------------------------------------------------------------------------

// Decide what should happen to one developer today. Pure function: it only
// looks at data and returns a plan; it changes nothing.
//   plan.kind: "complete" | "advance" | "assign" | "reminder" | "manager_alert" | "none"
function planFor(developer, progress, today) {
  // No Progress row for the current day (e.g. a previous run stopped
  // halfway): assign that day's task now.
  if (!progress) return { kind: 'assign' };

  if (progress.status === 'done') {
    return developer.currentDay >= 7 ? { kind: 'complete' } : { kind: 'advance' };
  }

  // Still pending. Count from the later of "assigned" and "join date", so
  // someone added a week before they start isn't reminded on their first day.
  const startedOn = [karachiDate(progress.assignedAt), karachiDate(developer.joinDate)].sort().pop();
  const daysPending = Math.max(0, karachiDaysBetween(startedOn, today));

  if (daysPending >= 2) return { kind: 'manager_alert', daysPending };
  if (daysPending === 1) return { kind: 'reminder', daysPending };
  return { kind: 'none', daysPending };
}

async function dailyRun(req, res) {
  const { dryRun = false } = matchedData(req, { locations: ['query'] });
  const now = new Date();
  const today = karachiDate(now); // "2026-11-14" in Pakistan
  const startOfToday = startOfKarachiDay(today);

  // "Not handled yet today" = never run, or last run was before today began.
  const notRunToday = { $or: [{ lastDailyRunAt: null }, { lastDailyRunAt: { $lt: startOfToday } }] };

  // Demo developers are left out completely: no WhatsApp actions, and their
  // data isn't changed either, so the demo stays as the seed created it.
  const real = { status: 'active', isDemo: { $ne: true } };

  const [tasks, developers, alreadyRunToday, demoSkipped] = await Promise.all([
    Task.find().sort({ day: 1 }).lean(),
    Developer.find({ ...real, ...notRunToday }).populate('manager', 'name managerPhone').lean(),
    Developer.countDocuments({ ...real, lastDailyRunAt: { $gte: startOfToday } }),
    Developer.countDocuments({ status: 'active', isDemo: true }),
  ]);

  const taskFor = (day, role) => tasks.find((t) => t.day === day && (t.role === 'All' || t.role === role));

  // One entry for n8n to turn into a WhatsApp message.
  // If the manager (or their phone) is missing, the action is still returned,
  // with managerPhone: null and missingManagerPhone: true, so n8n can skip
  // the manager message but still send the developer's.
  function action(type, dev, day, daysPending = 0) {
    const task = taskFor(day, dev.role);
    const managerPhone = dev.manager?.managerPhone || null;
    return {
      type,
      developerId: dev._id,
      name: dev.name,
      phone: dev.whatsappNumber,
      managerName: dev.manager?.name ?? null,
      managerPhone,
      missingManagerPhone: managerPhone === null,
      day,
      taskTitle: task?.title ?? null,
      taskDescription: task?.description ?? null,
      daysPending,
    };
  }

  // Gives the developer a pending Progress row for `day` (no-op if it exists).
  async function assignTask(dev, day) {
    const task = taskFor(day, dev.role);
    if (!task) return;
    await Progress.updateOne(
      { developer: dev._id, taskId: task.taskId },
      { $setOnInsert: { day, status: 'pending', assignedAt: now, completedAt: null } },
      { upsert: true }
    );
  }

  const actions = [];
  let notStartedYet = 0;
  let processed = 0;

  for (const dev of developers) {
    // Join date in the future: leave them alone until they start.
    if (karachiDate(dev.joinDate) > today) {
      notStartedYet++;
      continue;
    }

    const progress = await Progress.findOne({ developer: dev._id, day: dev.currentDay }).lean();
    const plan = planFor(dev, progress, today);

    // What to change on the developer (always includes "handled today").
    const changes = { lastDailyRunAt: now };
    if (plan.kind === 'complete') changes.status = 'completed';
    if (plan.kind === 'advance') changes.currentDay = dev.currentDay + 1;

    if (!dryRun) {
      // "Claim" the developer: only update if nobody handled them today yet
      // and they're still on the same day. If two runs happen at the same
      // moment, only one gets matchedCount = 1; the other skips them.
      const claim = await Developer.updateOne(
        { _id: dev._id, status: 'active', currentDay: dev.currentDay, ...notRunToday },
        { $set: changes }
      );
      if (claim.matchedCount === 0) continue;

      if (plan.kind === 'advance') await assignTask(dev, dev.currentDay + 1);
      if (plan.kind === 'assign') await assignTask(dev, dev.currentDay);
    }
    processed++;

    switch (plan.kind) {
      case 'complete':
        actions.push(action('completed', dev, dev.currentDay));
        break;
      case 'advance':
        actions.push(action('next_task', dev, dev.currentDay + 1));
        break;
      case 'assign':
        actions.push(action('next_task', dev, dev.currentDay));
        break;
      case 'reminder':
        actions.push(action('reminder', dev, dev.currentDay, plan.daysPending));
        break;
      case 'manager_alert':
        // Two messages: a nudge to the developer, and an alert to the manager.
        actions.push(action('reminder', dev, dev.currentDay, plan.daysPending));
        actions.push(action('manager_alert', dev, dev.currentDay, plan.daysPending));
        break;
      // 'none': handled today, nothing to send
    }
  }

  const counts = { next_task: 0, completed: 0, reminder: 0, manager_alert: 0 };
  for (const a of actions) counts[a.type]++;

  const summary = { processed, alreadyRunToday, notStartedYet, demoSkipped, counts };

  // A dry run must not change anything, so it isn't written to the audit log either.
  if (!dryRun) {
    await audit({ user: null, action: 'bot.daily_run', details: { date: today, ...summary }, ip: req.ip });
  }

  res.json({ date: today, dryRun, summary, actions });
}

// ---------------------------------------------------------------------------
// GET /api/bot/weekly-report
// ---------------------------------------------------------------------------

async function weeklyReport(req, res) {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * DAY_MS); // the last 7 days

  const managers = await User.find({ role: 'manager' }).select('name managerPhone').sort({ name: 1 }).lean();
  // Demo developers never appear in WhatsApp reports.
  const developers = await Developer.find({ manager: { $in: managers.map((m) => m._id) }, isDemo: { $ne: true } })
    .sort({ name: 1 })
    .lean();
  const devIds = developers.map((d) => d._id);

  const [progress, questions] = await Promise.all([
    Progress.find({ developer: { $in: devIds } }).lean(),
    Question.find({ developer: { $in: devIds }, foundInDocs: false, askedAt: { $gte: from } }).sort({ askedAt: 1 }).lean(),
  ]);

  const sameId = (a, b) => a.toString() === b.toString();

  const report = [];
  for (const manager of managers) {
    const devRows = [];
    const unansweredQuestions = [];

    for (const dev of developers.filter((d) => sameId(d.manager, manager._id))) {
      const devProgress = progress.filter((p) => sameId(p.developer, dev._id));
      const devQuestions = questions.filter((q) => sameId(q.developer, dev._id));
      const tasksDoneThisWeek = devProgress.filter((p) => p.status === 'done' && p.completedAt >= from).length;

      // Skip developers who finished earlier and had no activity this week.
      if (dev.status === 'completed' && tasksDoneThisWeek === 0 && devQuestions.length === 0) continue;

      const current = devProgress.find((p) => p.day === dev.currentDay);
      devRows.push({
        id: dev._id,
        name: dev.name,
        currentDay: dev.currentDay,
        status: dev.status,
        stuck: isStuck(dev, current), // same rule as the dashboard
        tasksDoneThisWeek,
        questionsNotInDocsThisWeek: devQuestions.length,
      });

      for (const q of devQuestions) {
        unansweredQuestions.push({
          developerName: dev.name,
          question: q.question,
          answer: q.answer,
          resolved: q.resolved,
          askedAt: q.askedAt,
        });
      }
    }

    // A manager with nobody to report on gets no message.
    if (devRows.length === 0) continue;

    report.push({
      managerName: manager.name,
      managerPhone: manager.managerPhone || null,
      missingManagerPhone: !manager.managerPhone, // n8n: nowhere to send this report
      developers: devRows,
      unansweredQuestions,
    });
  }

  res.json({ from, to, managers: report });
}

module.exports = { dailyRun, weeklyReport, planFor };
