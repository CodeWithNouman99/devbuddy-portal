// Knowledge gaps: questions the AI couldn't answer from the docs.
const { matchedData } = require('express-validator');
const { Question } = require('../models');
const audit = require('../utils/audit');
const { developerRefScope } = require('../utils/scope');
const { GAP_KEY, openGaps } = require('../utils/gaps');
const { DAY_MS } = require('../utils/time');

// GET /api/questions/gaps
async function listGaps(req, res) {
  const scope = await developerRefScope(req.user); // managers: own team only
  const since = new Date(Date.now() - 30 * DAY_MS);

  const [gaps, asked30, fromDocs30] = await Promise.all([
    openGaps(scope),
    Question.countDocuments({ ...scope, askedAt: { $gte: since } }),
    Question.countDocuments({ ...scope, askedAt: { $gte: since }, foundInDocs: true }),
  ]);

  res.json({
    kpis: {
      asked30Days: asked30,
      // null when nothing was asked (avoids showing a misleading 0%)
      answeredFromDocsPct: asked30 ? Math.round((fromDocs30 / asked30) * 100) : null,
      openGaps: gaps.length,
    },
    gaps,
  });
}

// PATCH /api/questions/gaps/resolve   body: { key }
// Marks every open question in that group as resolved.
async function resolveGap(req, res) {
  const { key } = matchedData(req, { locations: ['body'] });
  const scope = await developerRefScope(req.user);

  const result = await Question.updateMany(
    { ...scope, foundInDocs: false, resolved: false, $expr: { $eq: [GAP_KEY, key] } },
    { $set: { resolved: true } }
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json({ message: 'This gap was not found or is already fixed.' });
  }

  await audit({
    user: req.user._id,
    action: 'knowledge_gap_resolved',
    details: { question: key, questionsResolved: result.modifiedCount },
    ip: req.ip,
  });

  res.json({ ok: true, resolved: result.modifiedCount });
}

module.exports = { listGaps, resolveGap };
