
const { GoogleGenAI } = require('@google/genai');
const Quiz = require('../models/Quiz');

const buildQuizContext = (quiz) => {
  const summary = quiz.summary || 'No summary available.';
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  const questionContext = questions.length
    ? questions
        .map((question, index) => {
          const optionsText = (question.options || [])
            .map(
              (option, optionIndex) =>
                `${String.fromCharCode(65 + optionIndex)}. ${option}`
            )
            .join('\n');

          return `Question ${index + 1}: ${question.question}
Options:
${optionsText}
Correct answer: ${question.correctAnswer}`;
        })
        .join('\n\n')
    : 'No questions available.';

  return {
    summary,
    questionContext
  };
};

const chatWithQuizBot = async (req, res) => {
  try {
    const { quizId, message } = req.body;

    // ------------------------------------
    // Validate quiz ID
    // ------------------------------------
    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID is required.'
      });
    }

    // ------------------------------------
    // Validate user message
    // ------------------------------------
    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a question for the quiz AI.'
      });
    }

    // ------------------------------------
    // Check quiz ownership
    // ------------------------------------
    const quiz = await Quiz.findOne({
      _id: quizId,
      user: req.user._id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you do not have access to it.'
      });
    }

    // ------------------------------------
    // Check chatbot API key
    // ------------------------------------
    const apiKey = process.env.GEMINI_CHATBOT_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message:
          'The chatbot is not configured yet. Please add GEMINI_CHATBOT_API_KEY.'
      });
    }

    // ------------------------------------
    // Get chatbot models
    // ------------------------------------
    const models = (
      process.env.GEMINI_CHATBOT_MODELS ||
      'gemini-3.6-flash,gemini-3.5-flash,gemini-2.5-flash,gemini-2.5-flash-lite'
    )
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);

    if (!models.length) {
      return res.status(503).json({
        success: false,
        message: 'No chatbot models are configured.'
      });
    }

    // ------------------------------------
    // Build quiz context
    // ------------------------------------
    const { summary, questionContext } = buildQuizContext(quiz);
    const userQuestion = String(message).trim();

    const prompt = `You are a helpful AI tutor for this quiz.

Use only the information from the quiz summary and questions below.

If the user asks about a specific question number, reference the matching question in the list.

Keep the answer concise, clear, and helpful.

Do not invent facts that are not supported by the quiz content.

Quiz Summary:
${summary}

Quiz Questions:
${questionContext}

User question:
${userQuestion}

Answer in plain text.`;

    // ------------------------------------
    // Create Gemini client
    // ------------------------------------
    const ai = new GoogleGenAI({
      apiKey
    });

    let lastError = null;

    // ------------------------------------
    // Try models one by one
    // ------------------------------------
    for (const model of models) {
      try {
        console.log(`[AIController] Trying chatbot model: ${model}`);

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
            maxOutputTokens: 500
          }
        });

        const answer = response?.text?.trim();

        // ------------------------------------
        // If model returned a valid answer
        // ------------------------------------
        if (answer) {
          console.log(`[AIController] Chatbot success with: ${model}`);

          return res.status(200).json({
            success: true,
            data: {
              answer,
              model
            }
          });
        }

        // Empty response
        lastError = new Error(
          `Model ${model} returned an empty response.`
        );

        console.warn(
          `[AIController] Empty response from model: ${model}`
        );
      } catch (error) {
        lastError = error;

        console.warn(
          `[AIController] Model ${model} failed:`,
          error?.message || error
        );

        // Continue to the next model
      }
    }

    // ------------------------------------
    // All models failed
    // ------------------------------------
    console.error(
      '[AIController] All chatbot models failed:',
      lastError?.message || lastError
    );

    return res.status(502).json({
      success: false,
      message:
        'The AI chatbot is temporarily unavailable. Please try again in a moment.'
    });
  } catch (error) {
    console.error(
      '[AIController] chatWithQuizBot error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        'Something went wrong while processing your chatbot request. Please try again later.'
    });
  }
};

const buildFeedbackContext = (quiz, evaluatedAnswers = [], resultMeta = {}) => {
  const summary = quiz.summary || 'No summary available.';
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  const questionContext = questions.length
    ? questions
        .map((question, index) => {
          const selectedEntry = evaluatedAnswers.find(
            (entry) => Number(entry.questionIndex) === index
          );
          const selectedAnswer = selectedEntry
            ? selectedEntry.selectedAnswer
            : 'No answer selected';
          const isCorrect = selectedEntry ? Boolean(selectedEntry.isCorrect) : false;
          const optionsText = (question.options || [])
            .map(
              (option, optionIndex) =>
                `${String.fromCharCode(65 + optionIndex)}. ${option}`
            )
            .join('\n');

          return `Question ${index + 1}: ${question.question}\nOptions:\n${optionsText}\nCorrect answer: ${question.correctAnswer}\nStudent selected: ${selectedAnswer}\nStatus: ${isCorrect ? 'Correct' : 'Incorrect'}`;
        })
        .join('\n\n')
    : 'No question data available.';

  return {
    summary,
    questionContext,
    resultMeta
  };
};

const sanitizeFeedbackText = (text = '') => {
  if (typeof text !== 'string') return '';

  let cleaned = text
    .replace(/\b(?:narrative|analysis|reasoning|notes?)\b[\s:;\-]*?/gi, '')
    .replace(/\bQ\d+\s*:?/gi, '')
    .replace(/\b[A-Z]\s*[:;-]\s*(?=\w)/g, '')
    .replace(/\b(?:internal|raw|notes?)\b.*$/gim, '')
    .replace(/\*\*|__/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!/^\d+\.\s*What your answers show/i.test(cleaned)) {
    const lines = cleaned.split(/\n+/).filter(Boolean);
    const filtered = lines.filter((line) => !/^(narrative|analysis|notes?|raw reasoning|summary|reasoning)/i.test(line.trim()));

    cleaned = filtered.join('\n\n');
  }

  const allowedSections = [
    '1. What your answers show',
    '2. Where you got confused',
    '3. What to revise',
    '4. Your next step'
  ];

  const hasSections = allowedSections.some((section) => cleaned.includes(section));

  if (!hasSections) {
    cleaned = `1. What your answers show\n${cleaned}\n\n2. Where you got confused\nYour incorrect answers suggest a gap in the concept that the quiz is testing.\n\n3. What to revise\nReview the correct answer choices in the quiz summary and focus on the concept that separates the correct option from your selection.\n\n4. Your next step\nReview the relevant summary points and rework one or two example questions before trying a similar quiz again.`;
  }

  return cleaned.trim();
};

const generateQuizFeedback = async (quiz, evaluatedAnswers = [], resultMeta = {}) => {
  const apiKey = process.env.GEMINI_FEEDBACK_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'AI feedback is temporarily unavailable.'
    };
  }

  const models = (
    process.env.GEMINI_FEEDBACK_MODELS ||
    'gemini-3.6-flash,gemini-3.5-flash,gemini-2.5-flash,gemini-2.5-flash-lite'
  )
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  if (!models.length) {
    return {
      success: false,
      message: 'AI feedback is temporarily unavailable.'
    };
  }

  const { summary, questionContext, resultMeta: resolvedMeta } = buildFeedbackContext(
    quiz,
    evaluatedAnswers,
    resultMeta
  );

  const prompt = `You are a learning coach writing feedback for a student.

Use only the quiz summary, question text, answer choices, correct answer, the student's selected answer, and the score.
Do not invent causes for mistakes.
Do not mention internal notes, analysis steps, question numbers as shorthand, hidden reasoning, or labels like "narrative".
Do not use generic phrases such as "well done", "good job", "need improvement", "keep practicing", or similar filler.

Write plain student-facing feedback in clean Markdown/plain text with exactly these sections and titles:

1. What your answers show
2. Where you got confused
3. What to revise
4. Your next step

Rules:
- Base every sentence on the actual quiz data.
- If the student got something right, explain what that successful answer suggests about their understanding.
- For incorrect answers, explain the specific conceptual difference between the student's answer and the correct answer only when the data supports it.
- If the quiz data does not support the reason for a mistake, say only that the answer choice did not match the correct idea and that the student should review that concept.
- Focus on the exact concept, not broad praise or generic criticism.
- Keep the tone direct, clear, and helpful.
- Do not include bullet lists unless they are part of the structure naturally.
- Do not include markdown headings beyond the four required section headings.
- Do not output JSON.
- Do not include notes, fragments, or raw reasoning.

Student score: ${resolvedMeta.score ?? 0}/${resolvedMeta.totalQuestions ?? 0}
Percentage: ${resolvedMeta.percentage ?? 0}%
Pass/Fail: ${resolvedMeta.passed ? 'Pass' : 'Fail'}

Quiz summary:
${summary}

Quiz data:
${questionContext}

Write the final response directly to the student.`;

  const ai = new GoogleGenAI({ apiKey });
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[AIController] Trying feedback model: ${model}`);

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 500
        }
      });

      const rawFeedback = response?.text?.trim();
      const feedback = sanitizeFeedbackText(rawFeedback);

      if (feedback) {
        console.log(`[AIController] Feedback generated successfully with: ${model}`);
        return {
          success: true,
          data: {
            feedback,
            model
          }
        };
      }

      lastError = new Error(
        `Model ${model} returned an empty feedback response.`
      );

      console.warn(`[AIController] Empty feedback from model: ${model}`);
    } catch (error) {
      lastError = error;
      console.warn(
        `[AIController] Feedback model ${model} failed:`,
        error?.message || error
      );
    }
  }

  console.error(
    '[AIController] All feedback models failed:',
    lastError?.message || lastError
  );

  return {
    success: false,
    message: 'AI feedback is temporarily unavailable.'
  };
};

module.exports = {
  chatWithQuizBot,
  generateQuizFeedback,
  sanitizeFeedbackText
};

