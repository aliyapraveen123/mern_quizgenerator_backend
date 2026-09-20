const Quiz = require('../models/Quiz');

jest.mock('../models/Quiz');

jest.mock('../controllers/aiController', () => ({
  generateQuizFeedback: jest.fn().mockResolvedValue({
    success: true,
    data: { feedback: 'Your answers show strong understanding of the core ideas.' }
  })
}));

const { submitQuizResult } = require('../controllers/quizController');
const { generateQuizFeedback } = require('../controllers/aiController');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Quiz result feedback integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submits the score and includes AI feedback when available', async () => {
    const quiz = {
      _id: 'quiz-1',
      user: 'user-1',
      questions: [
        { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B' },
        { question: 'Q2', options: ['A', 'B', 'C', 'D'], correctAnswer: 'C' }
      ],
      save: jest.fn().mockResolvedValue(true)
    };

    Quiz.findOne.mockResolvedValue(quiz);

    const req = {
      user: { _id: 'user-1' },
      body: {
        quizId: 'quiz-1',
        answers: [
          { questionIndex: 0, selectedAnswer: 'B' },
          { questionIndex: 1, selectedAnswer: 'A' }
        ]
      }
    };

    const res = makeRes();

    await submitQuizResult(req, res);

    expect(generateQuizFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'quiz-1',
        user: 'user-1'
      }),
      expect.arrayContaining([
        expect.objectContaining({
          questionIndex: expect.any(Number)
        })
      ]),
      expect.objectContaining({
        score: 1,
        totalQuestions: 2,
        percentage: 50,
        passed: false
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.feedback).toBe('Your answers show strong understanding of the core ideas.');
  });

  test('keeps the quiz result successful even if AI feedback fails', async () => {
    const quiz = {
      _id: 'quiz-2',
      user: 'user-1',
      questions: [
        { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B' }
      ],
      save: jest.fn().mockResolvedValue(true)
    };

    Quiz.findOne.mockResolvedValue(quiz);
    generateQuizFeedback.mockRejectedValueOnce(new Error('AI unavailable'));

    const req = {
      user: { _id: 'user-1' },
      body: {
        quizId: 'quiz-2',
        answers: [{ questionIndex: 0, selectedAnswer: 'A' }]
      }
    };

    const res = makeRes();

    await submitQuizResult(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.feedback).toBeNull();
  });
});
