const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables from server/.env regardless of where node is executed
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Quiz Generator backend is running smoothly!',
    timestamp: new Date().toISOString()
  });
});

// Routes
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

// 404 Route Handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong while processing your request. Please try again later.'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

