const { sanitizeFeedbackText } = require('../controllers/aiController');

describe('AI feedback prompt sanitization', () => {
  test('removes internal notes and preserves student-facing sectioned feedback', () => {
    const raw = `narrative (Q2: why hometown feels like autopilot = knowing where going; Q3...)\n\n1. What your answers show\nYour answers show you understand the main idea.\n\n2. Where you got confused\nThe confusion was around the difference between moving by habit and making a conscious choice.\n\n3. What to revise\nFocus on the distinction between autopilot behavior and intentional action.\n\n4. Your next step\nReview the examples in the summary and compare them to the correct answer.`;

    const cleaned = sanitizeFeedbackText(raw);

    expect(cleaned).toContain('1. What your answers show');
    expect(cleaned).toContain('2. Where you got confused');
    expect(cleaned).toContain('3. What to revise');
    expect(cleaned).toContain('4. Your next step');
    expect(cleaned).not.toMatch(/narrative|Q2:|Q3:|internal notes/i);
  });
});
