const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a deal title'],
    trim: true
  },
  value: {
    type: Number,
    required: [true, 'Please add a deal value'],
    min: 0
  },
  stage: {
    type: String,
    enum: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    default: 'Lead'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Deal', DealSchema);
