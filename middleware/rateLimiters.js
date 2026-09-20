const rateLimit = require('express-rate-limit');

// General: used for sensitive auth endpoints
const createAuthLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 5,
    message = 'Too many requests from this IP, please try again later.'
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message
  });
};

// Specific limiters
const registerLimiter = createAuthLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many registration attempts, please try again in an hour.' });
const loginLimiter = createAuthLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts, please try again later.' });
const otpLimiter = createAuthLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many OTP requests, please try again in an hour.' });

module.exports = {
  registerLimiter,
  loginLimiter,
  otpLimiter
};
