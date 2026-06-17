const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User extends BaseModel {
  constructor(data) {
    super('users', data, User.hiddenFields);
  }

  async comparePassword(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }

  generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = otp;
    this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return otp;
  }

  generateResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    this.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    return resetToken;
  }
}

User.collectionName = 'users';
User.hiddenFields = ['password', 'otp', 'otpExpiry', 'resetPasswordToken', 'resetPasswordExpire'];

module.exports = User;
