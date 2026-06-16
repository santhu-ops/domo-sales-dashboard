const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Please add a customer']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Please add a product']
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: 1,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: [true, 'Please add unit price']
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  amount: {
    type: Number, // Computed: quantity * unitPrice * (1 - discount/100)
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  salesperson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'cash', 'check', 'other'],
    default: 'credit_card'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-generate sale number before save
SaleSchema.pre('save', async function (next) {
  if (!this.saleNumber) {
    const count = await mongoose.model('Sale').countDocuments();
    this.saleNumber = `SL-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Sale', SaleSchema);
