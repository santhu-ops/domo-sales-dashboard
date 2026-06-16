const express = require('express');
const router = express.Router();
const {
  register, verifyOTP, resendOTP, login,
  profile, updateProfile, changePassword,
  forgotPassword, resetPassword
} = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

// Public routes
router.post('/register',         register);
router.post('/verify-otp',       verifyOTP);
router.post('/resend-otp',       resendOTP);
router.post('/login',            login);
router.post('/forgot-password',  forgotPassword);
router.post('/reset-password',   resetPassword);

// Protected routes
router.get('/profile',           authenticateJWT, profile);
router.put('/update-profile',    authenticateJWT, updateProfile);
router.put('/change-password',   authenticateJWT, changePassword);

module.exports = router;
