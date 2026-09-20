const express = require('express');
const router = express.Router();
const { chatWithQuizBot } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const csrfProtection = require('../middleware/csrf');
const { chatbotLimiter } = require('../middleware/rateLimiters');

router.use(protect);
router.use(csrfProtection);
router.use(chatbotLimiter);

router.post('/chat', chatWithQuizBot);

module.exports = router;
