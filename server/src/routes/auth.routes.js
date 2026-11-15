// URL -> middleware -> controller, for everything under /api/auth
const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
const { login, logout, me } = require('../controllers/auth.controller');

const router = express.Router();

// Rules for the login form. Anything that fails is rejected with a 400
// before it ever reaches the database.
const loginRules = [
  body('email')
    .isString().withMessage('Enter your work email.')
    .trim()
    .toLowerCase()
    .notEmpty().withMessage('Enter your work email.')
    .isEmail().withMessage('Enter a valid email address.')
    .isLength({ max: 254 }).withMessage('Email is too long.'),
  body('password')
    .isString().withMessage('Enter your password.')
    .notEmpty().withMessage('Enter your password.')
    .isLength({ max: 128 }).withMessage('Password is too long.'),
  body('rememberMe').optional().isBoolean({ strict: true }).withMessage('rememberMe must be true or false.'),
];

router.post('/login', loginLimiter, loginRules, validate, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
