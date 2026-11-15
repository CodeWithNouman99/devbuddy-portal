// The audit log page (admin only).
const { matchedData } = require('express-validator');
const { AuditLog } = require('../models');

const PAGE_SIZE = 25;

// GET /api/audit?action=&page=
async function listAudit(req, res) {
  const { action, page = 1 } = matchedData(req, { locations: ['query'] });
  const filter = action ? { action } : {};

  const [items, total, actions] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('user', 'name email role')
      .lean(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct('action'), // every action type, for the filter dropdown
  ]);

  res.json({
    items,
    actions: actions.sort(),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

module.exports = { listAudit };
