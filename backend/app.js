const express = require('express');
const cors = require('cors');
const passport = require('passport');
require('dotenv').config();


const app = express();


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.options('/*splat', cors());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());
require('./config/passport')(passport);


const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const dealRoutes = require('./routes/dealRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const accountRoutes = require('./routes/accountRoutes');
const alertRoutes = require('./routes/alertRoutes');


app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/alerts', alertRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
