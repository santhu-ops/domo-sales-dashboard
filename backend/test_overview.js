const mongoose = require('mongoose');
require('dotenv').config();
const { getFullOverview } = require('./controllers/dashboardController');

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

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
    await mongoose.disconnect();
  } catch (err) {
    console.error('Test error:', err);
    await mongoose.disconnect();
  }
};

test();
