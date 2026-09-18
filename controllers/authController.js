const User = require('../models/User');
const jwt = require('jsonwebtoken');

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
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Create user (password is hashed automatically via pre-save hook)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id)
      }
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

    // Check password match
    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          token: generateToken(user._id)
        }
      });
    } else {
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

module.exports = {
  registerUser,
  loginUser,
  getMe
};

