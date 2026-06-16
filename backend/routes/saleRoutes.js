const express = require('express');
const router = express.Router();
const {
  getSales, getSaleById, createSale,
  updateSale, deleteSale, getSalesSummary
} = require('../controllers/saleController');
const { authenticateJWT } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/summary', getSalesSummary);
router.get('/',        getSales);
router.get('/:id',     getSaleById);
router.post('/',       createSale);
router.put('/:id',     updateSale);
router.delete('/:id',  deleteSale);

module.exports = router;
