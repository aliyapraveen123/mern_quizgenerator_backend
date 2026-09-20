const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerLimiter,
  loginLimiter,
  otpLimiter
} = require('../middleware/rateLimiters');

router.post('/register', registerLimiter, registerUser);
router.post('/resend-verification', otpLimiter, require('../controllers/authController').resendVerification);
router.post('/login', loginLimiter, loginUser);
router.post('/verify-otp', require('../controllers/authController').verifyEmail);

router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', secure: process.env.NODE_ENV === 'production' });
  return res.status(200).json({ success: true, message: 'Logged out' });
});
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;

