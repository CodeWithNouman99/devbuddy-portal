// Staff users: the manager dropdown (admin, hr) and Team & roles (admin only).
const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../models/User');
const { cleanWhatsappNumber } = require('../utils/phone');
const { listUsers, listManagers, createUser, updateUser } = require('../controllers/users.controller');

const router = express.Router();

router.use(requireAuth);

const createRules = [
  body('name')
    .isString().withMessage('Enter the full name.')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2 to 100 characters.'),
  body('email')
    .isString().withMessage('Enter an email address.')
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Enter a valid email address.')
    .isLength({ max: 254 }).withMessage('Email is too long.'),
  body('role').isIn(ROLES).withMessage('Choose a role.'),
  body('managerPhone')
    .optional({ values: 'falsy' })
    .isString().withMessage('Enter a valid WhatsApp number.')
    .customSanitizer(cleanWhatsappNumber)
    .matches(/^\d{10,15}$/).withMessage('Enter a valid WhatsApp number, e.g. 0300 1234567 or +92 300 1234567.'),
  body('password')
    .isString().withMessage('Enter a temporary password.')
    .isLength({ min: 10, max: 128 }).withMessage('Temporary password must be 10 to 128 characters.'),
];

const updateRules = [
  param('id').isMongoId().withMessage('User not found.'),
  body('role').optional().isIn(ROLES).withMessage('Choose a valid role.'),
  body('active').optional().isBoolean({ strict: true }).withMessage('active must be true or false.').toBoolean(),
  body().custom((value) => {
    if (value?.role === undefined && value?.active === undefined) {
      throw new Error('Nothing to change: send role and/or active.');
    }
    return true;
  }),
];

router.get('/managers', requireRole('admin', 'hr'), listManagers);
router.get('/', requireRole('admin'), listUsers);
router.post('/', requireRole('admin'), createRules, validate, createUser);
router.patch('/:id', requireRole('admin'), updateRules, validate, updateUser);

module.exports = router;
