const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Please add an alert message']
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'danger'],
    default: 'info'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Alert', AlertSchema);
