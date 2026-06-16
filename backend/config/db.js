const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const localFallbackUri = 'mongodb://127.0.0.1:27017/sales_dashboard';

  if (primaryUri) {
    try {
      console.log('Connecting to primary MongoDB Database...');
      // Set a connection timeout so we don't hang too long if the network is down
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 5000 // 5 seconds timeout
      });
      console.log(`MongoDB Connected (Primary): ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`Error connecting to primary MongoDB: ${error.message}`);
      console.log(`Attempting fallback connection to local MongoDB: ${localFallbackUri}...`);
    }
  }

  try {
    const conn = await mongoose.connect(localFallbackUri);
    console.log(`MongoDB Connected (Fallback/Local): ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to fallback MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

