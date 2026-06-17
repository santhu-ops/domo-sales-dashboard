const mongoose = require('mongoose');
require('dotenv').config();
const { getFullOverview } = require('./controllers/dashboardController');

const test = async () => {
  try {
    const req = {};
    const res = {
      status: function(code) {
        console.log('Status code:', code);
        return this;
      },
      json: function(data) {
        console.log('Response data keys:', Object.keys(data));
        console.log('Metrics:', data.metrics);
        console.log('Success:', data.success);
      }
    };

    await getFullOverview(req, res);
  } catch (err) {
    console.error('Test error:', err);
  }
};

test();
