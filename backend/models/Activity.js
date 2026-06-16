const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true
  },
  type: {
    type: String,
    enum: ['deal_created', 'stage_change', 'meeting', 'call', 'email', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    required: [true, 'Please add an activity description']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Activity', ActivitySchema);
