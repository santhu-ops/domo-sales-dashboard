const express = require('express');
const router = express.Router();
const { getRevenueOverview, exportExcel, exportPDF, getFullOverview } = require('../controllers/dashboardController');
const { authenticateJWT } = require('../middleware/auth');

router.get('/overview', authenticateJWT, getFullOverview);
router.get('/revenue', authenticateJWT, getRevenueOverview);
router.get('/revenue/export/excel', authenticateJWT, exportExcel);
router.get('/revenue/export/pdf', authenticateJWT, exportPDF);

module.exports = router;
