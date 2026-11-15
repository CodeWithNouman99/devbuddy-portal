// Numbers for the Overview page.
const { Developer, Progress } = require('../models');
const { developerScope, developerRefScope } = require('../utils/scope');
const { openGaps } = require('../utils/gaps');
const { isStuck } = require('../utils/onboarding');
const { karachiDate, karachiDaysBetween } = require('../utils/time');

const ATTENTION_LIMIT = 5; // max items in each "Needs your attention" list
const ALERT_AFTER_DAYS = 2; // same threshold as the daily run's manager_alert

// Calendar days (Pakistan time) a pending task has been waiting, counted the
// same way as the daily run: from the later of "assigned" and "join date".
function daysPending(developer, progress, today) {
  if (!progress || progress.status !== 'pending') return 0;
  const startedOn = [karachiDate(progress.assignedAt), karachiDate(developer.joinDate)].sort().pop();
  return Math.max(0, karachiDaysBetween(startedOn, today));
}

// GET /api/stats/overview
async function overview(req, res) {
  const today = karachiDate();
  const developers = await Developer.find(developerScope(req.user))
    .select('name role currentDay status joinDate isDemo')
    .lean();

  const [progress, topQuestions] = await Promise.all([
    Progress.find({ developer: { $in: developers.map((d) => d._id) } }).lean(),
    openGaps(await developerRefScope(req.user), ATTENTION_LIMIT),
  ]);

  // Progress rows grouped by developer id
  const progressByDev = new Map();
  for (const p of progress) {
    const key = p.developer.toString();
    if (!progressByDev.has(key)) progressByDev.set(key, []);
    progressByDev.get(key).push(p);
  }

  // One bar per day: how many active developers are on it, and how many of
  // those are stuck (same rule as the status pill on the Developers page).
  const byDay = Array.from({ length: 7 }, (_, i) => ({ day: i + 1, total: 0, stuck: 0 }));
  const stuck = [];
  const completed = [];
  let active = 0;
  let stuckTwoPlus = 0;

  for (const dev of developers) {
    const rows = progressByDev.get(dev._id.toString()) || [];

    if (dev.status === 'completed') {
      // Finished = when the day 7 task was done (the status itself only
      // changes at the next morning run). Fall back to the latest completion.
      const doneTimes = rows.filter((r) => r.completedAt).map((r) => new Date(r.completedAt));
      const day7 = rows.find((r) => r.day === 7 && r.completedAt);
      const finishedAt = day7 ? new Date(day7.completedAt) : doneTimes.sort((a, b) => b - a)[0];
      if (!finishedAt) continue;
      completed.push({
        _id: dev._id,
        name: dev.name,
        role: dev.role,
        isDemo: Boolean(dev.isDemo),
        finishedAt,
        // Inclusive: joined Monday, finished Sunday = 7 days
        daysToFinish: karachiDaysBetween(karachiDate(dev.joinDate), karachiDate(finishedAt)) + 1,
      });
      continue;
    }

    active++;
    const current = rows.find((r) => r.day === dev.currentDay);
    const devStuck = isStuck(dev, current);
    const pending = daysPending(dev, current, today);

    byDay[dev.currentDay - 1].total++;
    if (devStuck) {
      byDay[dev.currentDay - 1].stuck++;
      stuck.push({
        _id: dev._id,
        name: dev.name,
        role: dev.role,
        isDemo: Boolean(dev.isDemo),
        currentDay: dev.currentDay,
        daysPending: pending,
      });
    }
    if (pending >= ALERT_AFTER_DAYS) stuckTwoPlus++;
  }

  stuck.sort((a, b) => b.daysPending - a.daysPending || a.name.localeCompare(b.name));
  completed.sort((a, b) => b.finishedAt - a.finishedAt);

  const avgDaysToFinish = completed.length
    ? Math.round((completed.reduce((sum, d) => sum + d.daysToFinish, 0) / completed.length) * 10) / 10
    : null;

  res.json({
    kpis: {
      inOnboarding: active,
      finishedWeekOne: completed.length,
      stuckTwoPlusDays: stuckTwoPlus,
      avgDaysToFinish,
    },
    byDay,
    attention: {
      stuckTotal: stuck.length,
      stuck: stuck.slice(0, ATTENTION_LIMIT),
      questions: topQuestions,
      recentlyCompleted: completed.slice(0, ATTENTION_LIMIT),
    },
  });
}

module.exports = { overview };
