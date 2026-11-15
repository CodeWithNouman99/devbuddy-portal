// Dashboard numbers. Managers get numbers for their own developers only.
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { overview } = require('../controllers/stats.controller');

const router = express.Router();

router.get('/overview', requireAuth, requireRole('admin', 'hr', 'manager'), overview); // no inputs

module.exports = router;
