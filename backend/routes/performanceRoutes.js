const express = require('express');
const router = express.Router();
const { getLeaderboard, getPerformanceStats } = require('../controllers/performanceController');
const { authenticateJWT } = require('../middleware/auth');

router.get('/', authenticateJWT, getPerformanceStats);
router.get('/leaderboard', authenticateJWT, getLeaderboard);

module.exports = router;
