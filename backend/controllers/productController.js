const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
const getProducts = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: products.length,
      totalProducts: total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create product
// @route   POST /api/products
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, sku, stock, status } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
    }

    const product = await Product.create({
      name, description, price, category, sku, stock, status,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get product analytics
// @route   GET /api/products/analytics
const getProductAnalytics = async (req, res) => {
  try {
    const products = await Product.find({});
    
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const totalRevenue = products.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalUnitsSold = products.reduce((sum, p) => sum + (p.unitsSold || 0), 0);
    const outOfStock = products.filter(p => p.stock === 0 || p.status === 'out_of_stock').length;

    const byCategory = {};
    products.forEach(p => {
      if (!byCategory[p.category]) byCategory[p.category] = { count: 0, revenue: 0 };
      byCategory[p.category].count++;
      byCategory[p.category].revenue += p.revenue || 0;
    });
    const categoryBreakdown = Object.entries(byCategory).map(([cat, data]) => ({
      category: cat, ...data
    }));

    const topProducts = [...products]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 5);

    res.json({
      success: true,
      analytics: {
        totalProducts, activeProducts, totalRevenue, totalUnitsSold, outOfStock,
        categoryBreakdown, topProducts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductAnalytics
};
