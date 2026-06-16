const Deal = require('../models/Deal');
const User = require('../models/User');
const Activity = require('../models/Activity');


const getPerformanceStats = async (req, res) => {
  try {
    const deals = await Deal.find({});

    const totalRevenue = deals
      .filter(d => d.stage === 'Closed Won')
      .reduce((sum, d) => sum + d.value, 0);

    const pipelineValue = deals
      .filter(d => ['Lead', 'Qualified', 'Proposal', 'Negotiation'].includes(d.stage))
      .reduce((sum, d) => sum + d.value, 0);

    const totalDeals = deals.length;
    const closedWonCount = deals.filter(d => d.stage === 'Closed Won').length;
    const closedLostCount = deals.filter(d => d.stage === 'Closed Lost').length;

    const totalClosed = closedWonCount + closedLostCount;
    const averageWinRate = totalClosed > 0
      ? Math.round((closedWonCount / totalClosed) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        totalRevenue,
        pipelineValue,
        totalDeals,
        closedWonCount,
        closedLostCount,
        averageWinRate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({});
    const deals = await Deal.find({});

    const leaderboard = await Promise.all(users.map(async (user) => {
      const userDeals = deals.filter(d => d.owner.toString() === user._id.toString());

      const revenueGenerated = userDeals
        .filter(d => d.stage === 'Closed Won')
        .reduce((sum, d) => sum + d.value, 0);

      const dealsCount = userDeals.length;
      const closedWonCount = userDeals.filter(d => d.stage === 'Closed Won').length;
      const closedLostCount = userDeals.filter(d => d.stage === 'Closed Lost').length;

      const totalClosed = closedWonCount + closedLostCount;
      const winRate = totalClosed > 0
        ? Math.round((closedWonCount / totalClosed) * 100)
        : 0;

      const activitiesCount = await Activity.countDocuments({ userId: user._id });

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        revenueGenerated,
        dealsCount,
        closedWonCount,
        closedLostCount,
        winRate,
        activitiesCount
      };
    }));

    leaderboard.sort((a, b) => b.revenueGenerated - a.revenueGenerated);

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPerformanceStats,
  getLeaderboard
};
