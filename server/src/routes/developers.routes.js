// URL -> checks -> controller, for everything under /api/developers
const express = require('express');
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { DEV_ROLES } = require('../models/Developer');
const { cleanWhatsappNumber } = require('../utils/phone');
const { listDevelopers, createDeveloper, getDeveloper } = require('../controllers/developers.controller');

const router = express.Router();

// Every route in this file needs a signed-in user.
router.use(requireAuth);

const listRules = [
  query('q').optional().isString().trim().isLength({ max: 100 }).withMessage('Search is too long.'),
  query('role').optional({ values: 'falsy' }).isIn(DEV_ROLES).withMessage('Unknown role.'),
  query('status').optional({ values: 'falsy' }).isIn(['on_track', 'stuck', 'completed']).withMessage('Unknown status.'),
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('Invalid page.').toInt(),
];

const createRules = [
  body('name')
    .isString().withMessage('Enter the full name.')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2 to 100 characters.'),
  body('whatsappNumber')
    .isString().withMessage('Enter a WhatsApp number.')
    .customSanitizer(cleanWhatsappNumber) // "0300-1234567" -> "923001234567"
    .matches(/^\d{10,15}$/).withMessage('Enter a valid WhatsApp number, e.g. 0300 1234567 or +92 300 1234567.'),
  body('role').isIn(DEV_ROLES).withMessage('Choose a role.'),
  body('joinDate')
    .isISO8601({ strict: true }).withMessage('Enter a valid join date.')
    .toDate(),
  body('manager').optional({ values: 'falsy' }).isMongoId().withMessage('Choose a valid manager.'),
];

const idRule = [param('id').isMongoId().withMessage('Developer not found.')];

router.get('/', requireRole('admin', 'hr', 'manager'), listRules, validate, listDevelopers);
router.post('/', requireRole('admin', 'hr'), createRules, validate, createDeveloper);
router.get('/:id', requireRole('admin', 'hr', 'manager'), idRule, validate, getDeveloper);

module.exports = router;
