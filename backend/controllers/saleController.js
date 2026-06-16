const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

// @desc    Get all sales
// @route   GET /api/sales
const getSales = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('customer', 'firstName lastName email company')
        .populate('product', 'name price category')
        .populate('salesperson', 'name'),
      Sale.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: sales.length,
      totalSales: total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      sales
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer', 'firstName lastName email company phone')
      .populate('product', 'name price category')
      .populate('salesperson', 'name email');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create sale
// @route   POST /api/sales
const createSale = async (req, res) => {
  try {
    const { customer, product: productId, quantity, unitPrice, discount = 0, status, notes, paymentMethod, saleDate } = req.body;

    if (!customer || !productId || !quantity || !unitPrice) {
      return res.status(400).json({ success: false, message: 'Customer, product, quantity, and unit price are required' });
    }

    const amount = quantity * unitPrice * (1 - discount / 100);

    const sale = await Sale.create({
      customer, product: productId, quantity,
      unitPrice, discount, amount, status,
      notes, paymentMethod,
      saleDate: saleDate || Date.now(),
      salesperson: req.user._id
    });

    // Update product stats
    await Product.findByIdAndUpdate(productId, {
      $inc: { unitsSold: quantity, revenue: amount }
    });

    // Update customer total spend
    await Customer.findByIdAndUpdate(customer, {
      $inc: { totalSpend: amount }
    });

    const populatedSale = await Sale.findById(sale._id)
      .populate('customer', 'firstName lastName email company')
      .populate('product', 'name price category')
      .populate('salesperson', 'name');

    res.status(201).json({ success: true, sale: populatedSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update sale
// @route   PUT /api/sales/:id
const updateSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('customer', 'firstName lastName email company')
      .populate('product', 'name price category')
      .populate('salesperson', 'name');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete sale
// @route   DELETE /api/sales/:id
const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, message: 'Sale deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get sales summary stats
// @route   GET /api/sales/summary
const getSalesSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [allSales, monthlySales, lastMonthSales] = await Promise.all([
      Sale.find({ status: 'completed' }),
      Sale.find({ status: 'completed', saleDate: { $gte: startOfMonth } }),
      Sale.find({ status: 'completed', saleDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } })
    ]);

    const totalRevenue = allSales.reduce((s, sale) => s + sale.amount, 0);
    const monthlyRevenue = monthlySales.reduce((s, sale) => s + sale.amount, 0);
    const lastMonthRevenue = lastMonthSales.reduce((s, sale) => s + sale.amount, 0);
    const growthRate = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

    // Monthly trend (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const mStart = new Date(y, m, 1);
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59);
      const mSales = allSales.filter(s => {
        const sd = new Date(s.saleDate);
        return sd >= mStart && sd <= mEnd;
      });
      trend.push({
        month: `${months[m]} ${y.toString().slice(-2)}`,
        revenue: mSales.reduce((s, x) => s + x.amount, 0),
        count: mSales.length
      });
    }

    res.json({
      success: true,
      summary: {
        totalSales: allSales.length,
        totalRevenue,
        monthlyRevenue,
        growthRate,
        trend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSales, getSaleById, createSale,
  updateSale, deleteSale, getSalesSummary
};
