const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true
  },
  industry: {
    type: String,
    required: [true, 'Please add an industry'],
    trim: true
  },
  region: {
    type: String,
    required: [true, 'Please add a region'],
    trim: true
  },
  healthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  churnRiskFlag: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Account', AccountSchema);
