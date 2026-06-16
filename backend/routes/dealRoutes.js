const express = require('express');
const router = express.Router();
const { getDeals, getDealById, createDeal, updateDeal, deleteDeal } = require('../controllers/dealController');
const { authenticateJWT } = require('../middleware/auth');

router.get('/', authenticateJWT, getDeals);
router.get('/:id', authenticateJWT, getDealById);
router.post('/', authenticateJWT, createDeal);
router.put('/:id', authenticateJWT, updateDeal);
router.delete('/:id', authenticateJWT, deleteDeal);

module.exports = router;
