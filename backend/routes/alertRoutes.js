const express = require('express');
const router = express.Router();
const { getAlerts, readAlerts } = require('../controllers/alertController');
const { authenticateJWT } = require('../middleware/auth');

router.get('/', authenticateJWT, getAlerts);
router.post('/read', authenticateJWT, readAlerts);

module.exports = router;
