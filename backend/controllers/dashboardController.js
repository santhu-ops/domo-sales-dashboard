const Deal = require('../models/Deal');
const Account = require('../models/Account');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const { generateRevenueExcel, generateRevenuePDF } = require('../services/reportService');

// Helper to calculate start/end of current and previous months
const getMonthDateRanges = () => {
  const now = new Date();
  
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  return {
    startOfCurrentMonth,
    endOfCurrentMonth,
    startOfLastMonth,
    endOfLastMonth
  };
};

// @desc    Get revenue metrics and charts
// @route   GET /api/dashboard/revenue
// @access  Private
const getRevenueOverview = async (req, res) => {
  try {
    const deals = await Deal.find({});
    
    // Closed Won deals generate the revenue
    const wonDeals = deals.filter(d => d.stage === 'Closed Won');
    
    // 1. Total Revenue
    const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

    // 2. Monthly Revenue
    const { startOfCurrentMonth, endOfCurrentMonth, startOfLastMonth, endOfLastMonth } = getMonthDateRanges();
    
    const currentMonthDeals = wonDeals.filter(d => {
      const dDate = new Date(d.createdAt || d.updatedAt);
      return dDate >= startOfCurrentMonth && dDate <= endOfCurrentMonth;
    });
    const monthlyRevenue = currentMonthDeals.reduce((sum, d) => sum + d.value, 0);

    // 3. ARR (Annual Recurring Revenue = Monthly Revenue * 12)
    const arr = monthlyRevenue * 12;

    // 4. Growth Percentage Card
    const lastMonthDeals = wonDeals.filter(d => {
      const dDate = new Date(d.createdAt || d.updatedAt);
      return dDate >= startOfLastMonth && dDate <= endOfLastMonth;
    });
    const lastMonthRevenue = lastMonthDeals.reduce((sum, d) => sum + d.value, 0);

    let growthPercentage = 0;
    if (lastMonthRevenue > 0) {
      growthPercentage = Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    } else if (monthlyRevenue > 0) {
      growthPercentage = 100; // 100% growth if previous month had zero revenue
    }

    // 5. Revenue Trend Chart (Past 6 calendar months)
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const tempDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = tempDate.getMonth();
      const y = tempDate.getFullYear();
      
      const mStart = new Date(y, m, 1);
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59);

      const mDeals = wonDeals.filter(d => {
        const dDate = new Date(d.createdAt || d.updatedAt);
        return dDate >= mStart && dDate <= mEnd;
      });

      const mRev = mDeals.reduce((sum, d) => sum + d.value, 0);

      trendData.push({
        month: `${monthsName[m]} ${y.toString().slice(-2)}`,
        revenue: mRev,
        dealsCount: mDeals.length
      });
    }

    // 6. Revenue Breakdown (by stage)
    const pipelineData = [];
    const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    
    stages.forEach(stg => {
      const stageDeals = deals.filter(d => d.stage === stg);
      const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
      pipelineData.push({
        stage: stg,
        value: stageValue,
        count: stageDeals.length
      });
    });

    res.json({
      success: true,
      metrics: {
        totalRevenue,
        monthlyRevenue,
        arr,
        growthPercentage
      },
      trend: trendData,
      breakdown: pipelineData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export revenue data to Excel
// @route   GET /api/dashboard/revenue/export/excel
// @access  Private
const exportExcel = async (req, res) => {
  try {
    const deals = await Deal.find({}).populate('owner', 'name');
    const accounts = await Account.find({});

    const buffer = await generateRevenueExcel(deals, accounts);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Revenue_Report_' + Date.now() + '.xlsx'
    );

    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export revenue summary to PDF
// @route   GET /api/dashboard/revenue/export/pdf
// @access  Private
const exportPDF = async (req, res) => {
  try {
    const deals = await Deal.find({}).populate('owner', 'name');
    const wonDeals = deals.filter(d => d.stage === 'Closed Won');
    
    const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const pipelineValue = deals.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage))
      .reduce((sum, d) => sum + d.value, 0);

    // Simple, elegant HTML styling for Puppeteer PDF printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            padding: 20px;
            margin: 0;
          }
          .header {
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .title {
            color: #4f46e5;
            font-size: 28px;
            margin: 0 0 5px 0;
            font-weight: 700;
          }
          .subtitle {
            font-size: 14px;
            color: #64748b;
            margin: 0;
          }
          .kpi-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 20px;
          }
          .kpi-card {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          .kpi-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 5px;
          }
          .kpi-value {
            font-size: 22px;
            color: #0f172a;
            font-weight: bold;
          }
          .section-title {
            font-size: 18px;
            color: #334155;
            margin-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f1f5f9;
            color: #475569;
            text-align: left;
            padding: 10px;
            font-size: 12px;
            font-weight: bold;
            border-bottom: 2px solid #cbd5e1;
          }
          td {
            padding: 10px;
            font-size: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .status {
            font-weight: bold;
          }
          .status-won { color: #16a34a; }
          .status-pipeline { color: #2563eb; }
          .status-lost { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Sales & Revenue Executive Summary</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="kpi-container">
          <div class="kpi-card">
            <div class="kpi-label">Closed Revenue</div>
            <div class="kpi-value">$${totalRevenue.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Active Pipeline Value</div>
            <div class="kpi-value">$${pipelineValue.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Registered Deals</div>
            <div class="kpi-value">${deals.length}</div>
          </div>
        </div>

        <h2 class="section-title">Active Deals Pipeline</h2>
        <table>
          <thead>
            <tr>
              <th>Deal Name</th>
              <th>Owner</th>
              <th>Value</th>
              <th>Stage</th>
              <th>Probability</th>
            </tr>
          </thead>
          <tbody>
            ${deals.slice(0, 15).map(deal => `
              <tr>
                <td><strong>${deal.title}</strong></td>
                <td>${deal.owner ? deal.owner.name : 'Unassigned'}</td>
                <td>$${deal.value.toLocaleString()}</td>
                <td>
                  <span class="status ${
                    deal.stage === 'Closed Won' ? 'status-won' : 
                    deal.stage === 'Closed Lost' ? 'status-lost' : 'status-pipeline'
                  }">
                    ${deal.stage}
                  </span>
                </td>
                <td>${deal.probability}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="font-size: 10px; text-align: center; color: #94a3b8; margin-top: 50px;">
          Sales Dashboard Automated Executive Report. Confidential.
        </p>
      </body>
      </html>
    `;

    const pdfBuffer = await generateRevenuePDF(htmlContent);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Revenue_Report_' + Date.now() + '.pdf'
    );

    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFullOverview = async (req, res) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      totalProducts,
      activeProducts,
      completedSales,
      allSales
    ] = await Promise.all([
      Customer.countDocuments({}),
      Customer.countDocuments({ status: 'active' }),
      Product.countDocuments({}),
      Product.countDocuments({ status: 'active' }),
      Sale.find({ status: 'completed' }).populate('customer', 'firstName lastName company').populate('product', 'name price'),
      Sale.find({})
    ]);

    // Calculate total completed revenue
    const totalRevenue = completedSales.reduce((sum, s) => sum + s.amount, 0);

    // Calculate growth percentages
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const currentMonthSales = completedSales.filter(s => new Date(s.saleDate) >= startOfCurrentMonth);
    const lastMonthSales = completedSales.filter(s => {
      const d = new Date(s.saleDate);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    const currentMonthRevenue = currentMonthSales.reduce((sum, s) => sum + s.amount, 0);
    const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + s.amount, 0);

    let revenueGrowth = 0;
    if (lastMonthRevenue > 0) {
      revenueGrowth = Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    } else if (currentMonthRevenue > 0) {
      revenueGrowth = 100;
    }

    // Chart Data Generation: Daily (last 7 days)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const dSales = completedSales.filter(s => {
        const sd = new Date(s.saleDate);
        return sd >= d && sd < nextD;
      });

      dailyData.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        revenue: dSales.reduce((sum, s) => sum + s.amount, 0),
        salesCount: dSales.length
      });
    }

    // Weekly Data (last 4 weeks)
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7 + 7));
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 7);

      const wSales = completedSales.filter(s => {
        const sd = new Date(s.saleDate);
        return sd >= d && sd < nextD;
      });

      weeklyData.push({
        label: `W-${i + 1}`,
        revenue: wSales.reduce((sum, s) => sum + s.amount, 0),
        salesCount: wSales.length
      });
    }

    // Monthly Data (last 12 months)
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const mStart = new Date(y, m, 1);
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59);

      const mSales = completedSales.filter(s => {
        const sd = new Date(s.saleDate);
        return sd >= mStart && sd <= mEnd;
      });

      monthlyData.push({
        label: `${monthsName[m]} ${y.toString().slice(-2)}`,
        revenue: mSales.reduce((sum, s) => sum + s.amount, 0),
        salesCount: mSales.length
      });
    }

    // Yearly Data (last 5 years)
    const yearlyData = [];
    const currentYear = now.getFullYear();
    for (let i = 4; i >= 0; i--) {
      const y = currentYear - i;
      const yStart = new Date(y, 0, 1);
      const yEnd = new Date(y, 11, 31, 23, 59, 59);

      const ySales = completedSales.filter(s => {
        const sd = new Date(s.saleDate);
        return sd >= yStart && sd <= yEnd;
      });

      yearlyData.push({
        label: `${y}`,
        revenue: ySales.reduce((sum, s) => sum + s.amount, 0),
        salesCount: ySales.length
      });
    }

    // Top selling products (based on completed sales)
    const productQuantities = {};
    completedSales.forEach(s => {
      if (s.product) {
        const pid = s.product._id.toString();
        if (!productQuantities[pid]) {
          productQuantities[pid] = { name: s.product.name, quantity: 0, revenue: 0 };
        }
        productQuantities[pid].quantity += s.quantity;
        productQuantities[pid].revenue += s.amount;
      }
    });

    const topSellingProducts = Object.values(productQuantities)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent sales list (last 5)
    const recentSales = completedSales
      .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
      .slice(0, 5)
      .map(s => ({
        id: s._id,
        customerName: s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : 'Guest Customer',
        customerCompany: s.customer ? s.customer.company : '',
        productName: s.product ? s.product.name : 'Unknown Product',
        amount: s.amount,
        quantity: s.quantity,
        saleDate: s.saleDate
      }));

    res.json({
      success: true,
      metrics: {
        totalCustomers,
        activeCustomers,
        totalProducts,
        activeProducts,
        totalSales: allSales.length,
        completedSalesCount: completedSales.length,
        totalRevenue,
        currentMonthRevenue,
        revenueGrowth
      },
      charts: {
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
        yearly: yearlyData
      },
      topSellingProducts,
      recentSales
    });
  } catch (error) {
    console.error('Full dashboard overview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRevenueOverview,
  exportExcel,
  exportPDF,
  getFullOverview
};
