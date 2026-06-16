const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendOTPEmail, sendWelcomeEmail, sendForgotPasswordEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_sales_dashboard_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ─── Token Helpers ─────────────────────────────────────────────────
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department || '',
  avatar: user.avatar || '',
  isVerified: user.isVerified,
  createdAt: user.createdAt
});

// ─── Register ──────────────────────────────────────────────────────
// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const userCount = await User.countDocuments({});
    const assignedRole = userCount === 0 ? 'admin' : 'employee';

    const user = new User({ name, email: email.toLowerCase(), password, role: assignedRole });
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email (non-blocking)
    console.log(`[DEVELOPMENT] Registration OTP for ${email}: ${otp}`);
    sendOTPEmail(user, otp).catch(err => console.error('OTP email failed:', err));

    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email for the OTP verification code.',
      email: user.email
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Verify OTP ────────────────────────────────────────────────────
// @route POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiry +password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }
    if (!user.otp || user.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Send welcome email
    sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err));

    const token = signToken(user);
    res.json({ success: true, token, user: formatUser(user), message: 'Account verified successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Resend OTP ────────────────────────────────────────────────────
// @route POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+otp +otpExpiry');
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Account already verified' });

    const otp = user.generateOTP();
    await user.save();

    console.log(`[DEVELOPMENT] Resend OTP for ${email}: ${otp}`);
    sendOTPEmail(user, otp).catch(err => console.error('Resend OTP email failed:', err));
    res.json({ success: true, message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Login ─────────────────────────────────────────────────────────
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      // Resend OTP automatically
      const otp = user.generateOTP();
      await user.save();
      sendOTPEmail(user, otp).catch(err => console.error('Auto-resend OTP failed:', err));
      
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. A new OTP has been sent.',
        needsVerification: true,
        email: user.email
      });
    }

    const token = signToken(user);
    res.json({ success: true, token, user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Profile ───────────────────────────────────────────────────────
// @route GET /api/auth/profile
const profile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Profile ────────────────────────────────────────────────
// @route PUT /api/auth/update-profile
const updateProfile = async (req, res) => {
  try {
    const { name, department, avatar } = req.body;
    const update = {};
    if (name) update.name = name;
    if (department !== undefined) update.department = department;
    if (avatar !== undefined) update.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ success: true, user: formatUser(user), message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Change Password ───────────────────────────────────────────────
// @route PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Forgot Password ───────────────────────────────────────────────
// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If an account with that email exists, a reset code has been sent.' });
    }

    const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = crypto.createHash('sha256').update(resetOTP).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    console.log(`[DEVELOPMENT] Forgot Password OTP for ${email}: ${resetOTP}`);
    sendForgotPasswordEmail(user, resetOTP).catch(err => console.error('Reset email failed:', err));
    res.json({ success: true, message: 'Password reset code sent to your email.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Reset Password ────────────────────────────────────────────────
// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(otp.toString()).digest('hex');

    // Explicitly select hidden fields so we can compare them
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+resetPasswordToken +resetPasswordExpire +password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'No account found with that email address' });
    }

    console.log('[DEBUG] Reset attempt:', {
      email: email.toLowerCase(),
      hashedInput: hashedToken,
      storedHash: user.resetPasswordToken,
      expired: user.resetPasswordExpire ? new Date() > user.resetPasswordExpire : 'no expiry set',
      match: user.resetPasswordToken === hashedToken
    });

    if (!user.resetPasswordToken || user.resetPasswordToken !== hashedToken) {
      return res.status(400).json({ success: false, message: 'Invalid reset code. Please request a new one.' });
    }
    if (!user.resetPasswordExpire || new Date() > user.resetPasswordExpire) {
      return res.status(400).json({ success: false, message: 'Reset code has expired. Please request a new one.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  profile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};
