const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');

const verificationEmail = (otp) => ({
  subject: 'Your AI Quiz Generator verification code',
  text: `Your AI Quiz Generator verification code is ${otp}. It expires in 10 minutes. If you did not create an account, you can ignore this email.`,
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1e293b">
      <h2 style="margin:0 0 12px">Verify your email</h2>
      <p>Your AI Quiz Generator verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${otp}</p>
      <p>This code expires in 10 minutes. If you did not create an account, you can ignore this email.</p>
    </div>`
});

// Helper function to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, and password'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      if (!userExists.isVerified) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_UNVERIFIED',
          message: 'This account was created but has not been verified yet. Please enter the OTP or request a new code.'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Create user (password is hashed automatically via pre-save hook)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      isVerified: false
    });

    // Generate a 6-digit OTP, hash it and store with expiry (10 minutes)
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    user.verificationTokenHash = otpHash;
    user.verificationTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP via email. Do NOT expose it in an API response or server logs.
    const emailResult = await sendEmail({ to: user.email, ...verificationEmail(otp) });
    if (!emailResult.success) {
      // The account itself was created successfully. Keep that fact clear to
      // the client so a mail-provider outage is not presented as a bad form.
      return res.status(201).json({
        success: true,
        emailSent: false,
        code: emailResult.code,
        message: 'Your account was created, but we could not send the verification email yet. Please try again shortly.',
        data: responseData
      });
    }

    // Respond without returning the OTP or any verification URL
    const responseData = {
      _id: user._id,
      name: user.name,
      email: user.email
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully. A verification code has been sent to your email. Please verify to continue.',
      data: responseData
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to register user. Please try again later.'
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Check password match and whether email is verified
    if (user && (await user.matchPassword(password)) && user.isVerified) {
      // Generate token and set as HttpOnly cookie. Do not include token in body.
      const token = generateToken(user._id);
      const cookieOptions = {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        secure: process.env.NODE_ENV === 'production'
      };

      res.cookie('token', token, cookieOptions);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } else {
      // Generic message to avoid leaking whether email exists or is verified
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to login. Please try again later.'
    });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private (Protected by JWT)
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
};

// Verify OTP endpoint (POST /api/auth/verify-otp)
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid OTP or email' });
    if (!user.verificationTokenHash || !user.verificationTokenExpires) return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    if (user.verificationTokenExpires < Date.now()) return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });

    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
    if (otpHash !== user.verificationTokenHash) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    user.isVerified = true;
    user.verificationTokenHash = null;
    user.verificationTokenExpires = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('verifyEmail error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
};

// Resend OTP endpoint
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    const genericResponse = { success: true, message: 'If an account exists, an OTP has been sent.' };
    if (!user) return res.status(200).json(genericResponse);
    if (user.isVerified) return res.status(200).json({ success: true, message: 'Account already verified. Please login.' });

    // Generate new OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    user.verificationTokenHash = otpHash;
    user.verificationTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const emailResult = await sendEmail({ to: user.email, ...verificationEmail(otp) });
    if (!emailResult.success) {
      return res.status(503).json({
        success: false,
        code: emailResult.code,
        message: 'We could not send the verification email. Please try again shortly.'
      });
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('resendVerification error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to resend verification' });
  }
};

// @desc    Initiate forgot password (send reset token)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    const genericResponse = { success: true, message: 'If an account exists, a password reset email has been sent.' };
    if (!user) return res.status(200).json(genericResponse);

    // Create reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordTokenHash = resetHash;
    user.resetPasswordTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const base = req.protocol + '://' + req.get('host');
    const resetUrl = `${base}/api/auth/reset-password?token=${resetToken}`;
    console.info('[Auth] Password reset URL:', resetUrl);

    if (process.env.NODE_ENV === 'production') {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Password reset',
          html: `<p>Reset your password by clicking the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
        });
      } catch (err) {
        console.error('Failed to send reset email:', err.message);
      }
      return res.status(200).json(genericResponse);
    }

    return res.status(200).json({ ...genericResponse, resetUrl });
  } catch (err) {
    console.error('forgotPassword error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to process request' });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Invalid request' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordTokenHash: tokenHash });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    if (user.resetPasswordTokenExpires && user.resetPasswordTokenExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    user.password = password; // will be hashed by pre-save hook
    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpires = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword
};
