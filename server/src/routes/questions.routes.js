// Knowledge gaps (admin + manager; managers only see their own team's questions).
const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { listGaps, resolveGap } = require('../controllers/questions.controller');

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'manager'));

const resolveRules = [
  // The group "key" exactly as GET /gaps returned it (lower-case question text)
  body('key')
    .isString().withMessage('key is required.')
    .isLength({ min: 1, max: 2000 }).withMessage('key must be 1 to 2000 characters.'),
];

router.get('/gaps', listGaps); // no inputs
router.patch('/gaps/resolve', resolveRules, validate, resolveGap);

module.exports = router;
