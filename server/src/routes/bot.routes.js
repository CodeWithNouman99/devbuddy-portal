// /api/bot: called by n8n (server to server), NOT by the browser.
// Order of checks: rate limit -> secret header -> input validation -> controller.
const express = require('express');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { botLimiter } = require('../middleware/rateLimit');
const { requireBotSecret } = require('../middleware/botAuth');
const { cleanWhatsappNumber } = require('../utils/phone');
const { getContext, completeTask, saveQuestion } = require('../controllers/bot.controller');
const { dailyRun, weeklyReport } = require('../controllers/botSchedule.controller');

const router = express.Router();

router.use(botLimiter, requireBotSecret);

const contextRules = [
  query('phone')
    .isString().withMessage('phone is required.')
    .customSanitizer(cleanWhatsappNumber) // same cleaning as Add developer
    .matches(/^\d{10,15}$/).withMessage('phone must be a WhatsApp number, e.g. 923001234567.'),
];

const completeRules = [
  body('progressId').isMongoId().withMessage('progressId must be a valid id.'),
];

const questionRules = [
  body('developerId').isMongoId().withMessage('developerId must be a valid id.'),
  body('question')
    .isString().withMessage('question is required.')
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('question must be 1 to 2000 characters.'),
  body('answer')
    .optional({ values: 'null' })
    .isString().withMessage('answer must be text.')
    .trim()
    .isLength({ max: 5000 }).withMessage('answer must be at most 5000 characters.'),
  body('foundInDocs')
    // Accepts true/false, and also "true"/"false" in case an n8n expression sends text
    .isBoolean().withMessage('foundInDocs must be true or false.')
    .toBoolean(true),
];

const dailyRunRules = [
  query('dryRun').optional().isBoolean().withMessage('dryRun must be true or false.').toBoolean(true),
];

router.get('/context', contextRules, validate, getContext);
router.post('/tasks/complete', completeRules, validate, completeTask);
router.post('/questions', questionRules, validate, saveQuestion);
router.post('/daily/run', dailyRunRules, validate, dailyRun);
router.get('/weekly-report', weeklyReport); // no inputs

module.exports = router;
