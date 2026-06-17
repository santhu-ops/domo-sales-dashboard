const mongoose = require('mongoose');
require('dotenv').config();
const { getRevenueOverview } = require('./controllers/dashboardController');

const test = async () => {
  try {
    const req = {};
    const res = {
      status: function(code) {
        console.log('Status code:', code);
        return this;
      },
      json: function(data) {
        console.log('Response data:', JSON.stringify(data, null, 2));
      }
    };

    await getRevenueOverview(req, res);
  } catch (err) {
    console.error('Test error:', err);
  }
};

test();
