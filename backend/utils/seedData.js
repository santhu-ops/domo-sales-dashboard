const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Account = require('../models/Account');
const Deal = require('../models/Deal');
const Alert = require('../models/Alert');
const Activity = require('../models/Activity');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Seeder: Connected to database. Clearing existing records...');


    await User.deleteMany({});
    await Account.deleteMany({});
    await Deal.deleteMany({});
    await Alert.deleteMany({});
    await Activity.deleteMany({});

    console.log('Seeder: Collections cleared. Seeding users...');


    const users = await User.create([
      {
        name: 'Sarah Connor',
        email: 'admin@salesdashboard.com',
        password: 'Password123',
        role: 'admin'
      },
      {
        name: 'John Miller',
        email: 'manager@salesdashboard.com',
        password: 'Password123',
        role: 'manager'
      },
      {
        name: 'Alex Mercer',
        email: 'alex.rep@salesdashboard.com',
        password: 'Password123',
        role: 'rep'
      },
      {
        name: 'Elena Rostova',
        email: 'elena.rep@salesdashboard.com',
        password: 'Password123',
        role: 'rep'
      },
      {
        name: 'David Kim',
        email: 'david.rep@salesdashboard.com',
        password: 'Password123',
        role: 'rep'
      }
    ]);

    const admin = users[0];
    const manager = users[1];
    const repAlex = users[2];
    const repElena = users[3];
    const repDavid = users[4];

    console.log('Seeder: Users created. Seeding customer accounts...');


    const accounts = await Account.create([
      { companyName: 'Acme Corp', industry: 'Manufacturing', region: 'North America', healthScore: 92, churnRiskFlag: false },
      { companyName: 'TechCorp Solutions', industry: 'Technology', region: 'North America', healthScore: 85, churnRiskFlag: false },
      { companyName: 'Global Finance Group', industry: 'Finance', region: 'Europe', healthScore: 45, churnRiskFlag: true },
      { companyName: 'MediHealth Systems', industry: 'Healthcare', region: 'Europe', healthScore: 88, churnRiskFlag: false },
      { companyName: 'Asia Retail Ventures', industry: 'Retail', region: 'Asia Pacific', healthScore: 68, churnRiskFlag: false },
      { companyName: 'EcoPower Energy', industry: 'Energy', region: 'Latin America', healthScore: 78, churnRiskFlag: false },
      { companyName: 'Cyberdyne Systems', industry: 'Technology', region: 'Asia Pacific', healthScore: 30, churnRiskFlag: true },
      { companyName: 'Vanguard Invest', industry: 'Finance', region: 'North America', healthScore: 95, churnRiskFlag: false }
    ]);

    console.log('Seeder: Accounts created. Seeding deals...');


    const now = new Date();


    const curMonthDate = (day) => new Date(now.getFullYear(), now.getMonth(), day);


    const prevMonthDate = (day) => new Date(now.getFullYear(), now.getMonth() - 1, day);


    const dealsData = [

      { title: 'TechCorp Solutions - Cloud Migration', value: 85000, stage: 'Closed Won', owner: repAlex._id, probability: 100, createdAt: curMonthDate(5) },
      { title: 'Acme Corp - ERP License Upgrade', value: 45000, stage: 'Closed Won', owner: repElena._id, probability: 100, createdAt: curMonthDate(8) },
      { title: 'Vanguard Invest - Security Suite', value: 35000, stage: 'Closed Won', owner: repDavid._id, probability: 100, createdAt: curMonthDate(12) },
      { title: 'MediHealth Systems - Telehealth Deployment', value: 120000, stage: 'Closed Won', owner: repAlex._id, probability: 100, createdAt: curMonthDate(18) },


      { title: 'TechCorp Solutions - Dedicated Servers', value: 60000, stage: 'Closed Won', owner: repAlex._id, probability: 100, createdAt: prevMonthDate(5) },
      { title: 'Acme Corp - Support Renewal', value: 25000, stage: 'Closed Won', owner: repElena._id, probability: 100, createdAt: prevMonthDate(10) },
      { title: 'Global Finance Group - Auditing API', value: 40000, stage: 'Closed Won', owner: repDavid._id, probability: 100, createdAt: prevMonthDate(15) },


      { title: 'Global Finance Group - Cybersecurity Consultation', value: 55000, stage: 'Negotiation', owner: repDavid._id, probability: 80, createdAt: curMonthDate(14) },
      { title: 'Cyberdyne Systems - Robotic Automation API', value: 95000, stage: 'Proposal', owner: repElena._id, probability: 60, createdAt: curMonthDate(15) },
      { title: 'Asia Retail Ventures - POS System Rollout', value: 30000, stage: 'Qualified', owner: repAlex._id, probability: 40, createdAt: curMonthDate(2) },
      { title: 'EcoPower Energy - Grid Management Software', value: 75000, stage: 'Proposal', owner: repElena._id, probability: 50, createdAt: curMonthDate(22) },
      { title: 'Vanguard Invest - Trading Engine Upgrade', value: 110000, stage: 'Negotiation', owner: repDavid._id, probability: 90, createdAt: curMonthDate(24) },
      { title: 'Acme Corp - Supply Chain Analytics', value: 15000, stage: 'Lead', owner: repElena._id, probability: 10, createdAt: curMonthDate(25) },

      // Closed Lost Deals
      { title: 'EcoPower Energy - Solar Optimization Audit', value: 50000, stage: 'Closed Lost', owner: repDavid._id, probability: 0, createdAt: prevMonthDate(20) },
      { title: 'Cyberdyne Systems - CPU Mainframe License', value: 130000, stage: 'Closed Lost', owner: repAlex._id, probability: 0, createdAt: curMonthDate(10) }
    ];

    const deals = await Deal.create(dealsData);

    console.log('Seeder: Deals created. Seeding Alerts and Activities...');


    await Alert.create([
      {
        message: 'High Value Deal Created: "Vanguard Invest - Trading Engine Upgrade" valued at $110,000 by David Kim',
        type: 'danger',
        isRead: false,
        createdAt: curMonthDate(24)
      },
      {
        message: 'High Value Deal Created: "MediHealth Systems - Telehealth Deployment" valued at $120,000 by Alex Mercer',
        type: 'danger',
        isRead: true,
        createdAt: curMonthDate(18)
      },
      {
        message: 'System Alert: Monthly reports are ready for export.',
        type: 'info',
        isRead: true,
        createdAt: curMonthDate(1)
      }
    ]);

    // 5. Seed Activities
    await Activity.create([
      {
        userId: repAlex._id,
        dealId: deals[0]._id, // TechCorp Solutions - Cloud Migration
        type: 'deal_created',
        description: 'Alex Mercer created the deal "TechCorp Solutions - Cloud Migration".'
      },
      {
        userId: repAlex._id,
        dealId: deals[0]._id,
        type: 'meeting',
        description: 'Meeting conducted with TechCorp CTO regarding Cloud Architecture plan.'
      },
      {
        userId: repElena._id,
        dealId: deals[1]._id, // Acme Corp - ERP License Upgrade
        type: 'stage_change',
        description: 'Elena Rostova updated "Acme Corp - ERP License Upgrade" status to Closed Won.'
      },
      {
        userId: repDavid._id,
        dealId: deals[7]._id, // Global Finance Group - Cybersecurity Consultation
        type: 'call',
        description: 'Follow-up call to review service agreement. Proposal reviewed.'
      },
      {
        userId: repElena._id,
        dealId: deals[8]._id,
        type: 'email',
        description: 'Sent initial pricing proposal to Cyberdyne project board.'
      }
    ]);

    console.log('Seeder: Database successfully populated!');
    await mongoose.disconnect();
    console.log('Seeder: Disconnected from database.');
  } catch (error) {
    console.error('Seeder failed with error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedData();
