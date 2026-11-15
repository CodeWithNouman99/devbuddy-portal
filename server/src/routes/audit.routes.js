// Audit log (admin only).
const express = require('express');
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listAudit } = require('../controllers/audit.controller');

const router = express.Router();

const listRules = [
  query('action')
    .optional({ values: 'falsy' })
    .isString()
    .matches(/^[a-z0-9_.]{1,60}$/).withMessage('Unknown action type.'),
  query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid page.').toInt(),
];

router.get('/', requireAuth, requireRole('admin'), listRules, validate, listAudit);

module.exports = router;
