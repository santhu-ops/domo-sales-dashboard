const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { sendHighValueDealAlert } = require('../services/emailService');


const getDeals = async (req, res) => {
  try {
    const { stage, search, owner, page = 1, limit = 10 } = req.query;
    const query = {};

    if (stage) {
      query.stage = stage;
    }

    if (owner) {
      query.owner = owner;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const totalDeals = await Deal.countDocuments(query);
    const totalPages = Math.ceil(totalDeals / limitNumber);

    const deals = await Deal.find(query)
      .populate('owner', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    res.json({
      success: true,
      count: deals.length,
      totalPages,
      currentPage: pageNumber,
      totalDeals,
      deals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id).populate('owner', 'name email role');
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const activities = await Activity.find({ dealId: deal._id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      deal,
      activities
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const createDeal = async (req, res) => {
  try {
    const { title, value, stage, owner, probability } = req.body;

    const deal = await Deal.create({
      title,
      value,
      stage,
      owner,
      probability
    });

    const populatedDeal = await Deal.findById(deal._id).populate('owner', 'name email role');
    const ownerName = populatedDeal.owner ? populatedDeal.owner.name : 'Unknown';

    await Activity.create({
      userId: req.user._id,
      dealId: deal._id,
      type: 'deal_created',
      description: `${req.user.name} created the deal "${deal.title}".`
    });

    if (value >= 50000) {
      const alertMessage = `High Value Deal Created: "${deal.title}" valued at $${value.toLocaleString()} by ${ownerName}`;

      await Alert.create({
        message: alertMessage,
        type: 'danger'
      });

      const notifyUsers = await User.find({ role: { $in: ['admin', 'manager'] } });
      const adminEmails = notifyUsers.map(u => u.email);

      sendHighValueDealAlert(deal, ownerName, adminEmails)
        .catch(err => console.error('Failed to send high value deal alert email:', err));
    }

    res.status(201).json({
      success: true,
      deal: populatedDeal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateDeal = async (req, res) => {
  try {
    const { title, value, stage, owner, probability } = req.body;

    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const oldStage = deal.stage;

    if (title !== undefined) deal.title = title;
    if (value !== undefined) deal.value = value;
    if (stage !== undefined) deal.stage = stage;
    if (owner !== undefined) deal.owner = owner;
    if (probability !== undefined) deal.probability = probability;

    await deal.save();

    const populatedDeal = await Deal.findById(deal._id).populate('owner', 'name email role');

    if (stage && stage !== oldStage) {
      await Activity.create({
        userId: req.user._id,
        dealId: deal._id,
        type: 'stage_change',
        description: `${req.user.name} updated "${deal.title}" status to ${stage}.`
      });
    } else {
      await Activity.create({
        userId: req.user._id,
        dealId: deal._id,
        type: 'other',
        description: `${req.user.name} updated the details of "${deal.title}".`
      });
    }

    res.json({
      success: true,
      deal: populatedDeal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    await Activity.deleteMany({ dealId: deal._id });
    await Deal.deleteOne({ _id: deal._id });

    res.json({
      success: true,
      message: 'Deal removed successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal
};
