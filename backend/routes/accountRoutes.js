const express = require('express');
const router = express.Router();
const { getAccounts, getAccountAnalytics, createAccount } = require('../controllers/accountController');
const { authenticateJWT } = require('../middleware/auth');

router.get('/', authenticateJWT, getAccounts);
router.get('/analytics', authenticateJWT, getAccountAnalytics);
router.post('/', authenticateJWT, createAccount);

module.exports = router;
