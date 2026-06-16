const Alert = require('../models/Alert');


const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({}).sort({ createdAt: -1 });
    const unreadCount = await Alert.countDocuments({ isRead: false });

    res.json({
      success: true,
      count: alerts.length,
      unreadCount,
      alerts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark alerts as read
// @route   POST /api/alerts/read
// @access  Private
const readAlerts = async (req, res) => {
  try {
    const { alertId, all = false } = req.body;

    if (all) {
      // Mark all as read
      await Alert.updateMany({ isRead: false }, { $set: { isRead: true } });
      return res.json({ success: true, message: 'All alerts marked as read' });
    }

    if (!alertId) {
      return res.status(400).json({ success: false, message: 'Please specify alertId or set all: true' });
    }

    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.isRead = true;
    await alert.save();

    res.json({ success: true, alert, message: 'Alert marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAlerts,
  readAlerts
};
