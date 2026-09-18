const express = require('express');
const router = express.Router();
const {
  generateQuiz,
  submitQuizResult,
  getQuizHistory,
  getQuizById
} = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

// All quiz endpoints require JWT authentication
router.use(protect);

router.post('/generate', generateQuiz);
router.post('/result', submitQuizResult);
router.get('/history', getQuizHistory);
router.get('/:id', getQuizById);

module.exports = router;

