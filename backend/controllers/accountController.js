const Account = require('../models/Account');
const Deal = require('../models/Deal');

const getAccounts = async (req, res) => {
  try {
    const { search, industry, region, churnRisk } = req.query;
    const query = {};

    if (search) {
      query.companyName = { $regex: search, $options: 'i' };
    }
    if (industry) {
      query.industry = industry;
    }
    if (region) {
      query.region = region;
    }
    if (churnRisk) {
      query.churnRiskFlag = churnRisk === 'true';
    }

    const accounts = await Account.find(query);
    const wonDeals = await Deal.find({ stage: 'Closed Won' });

    // Attach revenue to each account by matching companyName in deal titles
    const accountsWithRevenue = accounts.map(account => {
      const accountRevenue = wonDeals
        .filter(deal => deal.title.toLowerCase().includes(account.companyName.toLowerCase()))
        .reduce((sum, deal) => sum + deal.value, 0);

      const accountObj = account.toObject();
      accountObj.revenue = accountRevenue;
      return accountObj;
    });

    res.json({
      success: true,
      count: accountsWithRevenue.length,
      accounts: accountsWithRevenue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const createAccount = async (req, res) => {
  try {
    const { companyName, industry, region, healthScore, churnRiskFlag } = req.body;

    const account = await Account.create({
      companyName,
      industry,
      region,
      healthScore,
      churnRiskFlag
    });

    res.status(201).json({
      success: true,
      account
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getAccountAnalytics = async (req, res) => {
  try {
    const accounts = await Account.find({});
    const wonDeals = await Deal.find({ stage: 'Closed Won' });

    const accountsWithRevenue = accounts.map(account => {
      const revenue = wonDeals
        .filter(deal => deal.title.toLowerCase().includes(account.companyName.toLowerCase()))
        .reduce((sum, deal) => sum + deal.value, 0);
      return {
        ...account.toObject(),
        revenue
      };
    });


    const industryMap = {};
    accountsWithRevenue.forEach(acc => {
      if (!industryMap[acc.industry]) {
        industryMap[acc.industry] = 0;
      }
      industryMap[acc.industry] += acc.revenue;
    });
    const revenueByIndustry = Object.keys(industryMap).map(ind => ({
      industry: ind,
      revenue: industryMap[ind]
    }));


    const regionMap = {};
    accountsWithRevenue.forEach(acc => {
      if (!regionMap[acc.region]) {
        regionMap[acc.region] = 0;
      }
      regionMap[acc.region] += acc.revenue;
    });
    const revenueByRegion = Object.keys(regionMap).map(reg => ({
      region: reg,
      revenue: regionMap[reg]
    }));


    const topCustomers = [...accountsWithRevenue]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);


    const totalAccounts = accounts.length;
    const churnRiskCount = accounts.filter(acc => acc.churnRiskFlag).length;
    const healthyCount = totalAccounts - churnRiskCount;
    const averageHealth = totalAccounts > 0
      ? Math.round(accounts.reduce((sum, acc) => sum + acc.healthScore, 0) / totalAccounts)
      : 100;

    res.json({
      success: true,
      analytics: {
        revenueByIndustry,
        revenueByRegion,
        topCustomers,
        healthSummary: {
          totalAccounts,
          averageHealth,
          churnRiskCount,
          healthyCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAccounts,
  createAccount,
  getAccountAnalytics
};
