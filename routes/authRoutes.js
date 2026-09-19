const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
	registerLimiter,
	loginLimiter,
	forgotPasswordLimiter,
	resetPasswordLimiter,
	otpLimiter
} = require('../middleware/rateLimiters');

router.post('/register', registerLimiter, registerUser);
// Resend OTP (rate limited)
router.post('/resend-verification', otpLimiter, require('../controllers/authController').resendVerification);
router.post('/login', loginLimiter, loginUser);
// Verify OTP (POST) endpoint replaces old dev verification URL flow
router.post('/verify-otp', require('../controllers/authController').verifyEmail);
router.post('/forgot-password', forgotPasswordLimiter, require('../controllers/authController').forgotPassword);
router.post('/reset-password', resetPasswordLimiter, require('../controllers/authController').resetPassword);
// Logout clears the auth cookie
router.post('/logout', (req, res) => {
	res.clearCookie('token', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', secure: process.env.NODE_ENV === 'production' });
	return res.status(200).json({ success: true, message: 'Logged out' });
});
router.get('/me', protect, getMe);

module.exports = router;

