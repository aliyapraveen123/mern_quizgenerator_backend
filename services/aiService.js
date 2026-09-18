const { GoogleGenAI } = require("@google/genai");

// ------------------------------------
// Validate AI generated quiz data
// ------------------------------------
function validateQuizData(data, expectedCount = null) {
  if (!data || typeof data !== "object") {
    return false;
  }

  if (!data.summary || typeof data.summary !== "string") {
    return false;
  }

  if (!Array.isArray(data.questions)) {
    return false;
  }

  if (
    expectedCount &&
    data.questions.length !== Number(expectedCount)
  ) {
    return false;
  }

  if (
    !expectedCount &&
    (data.questions.length < 5 || data.questions.length > 10)
  ) {
    return false;
  }

  for (const question of data.questions) {
    if (!question || typeof question !== "object") {
      return false;
    }

    if (
      !question.question ||
      typeof question.question !== "string"
    ) {
      return false;
    }

    if (
      !Array.isArray(question.options) ||
      question.options.length !== 4
    ) {
      return false;
    }

    if (
      !question.correctAnswer ||
      typeof question.correctAnswer !== "string"
    ) {
      return false;
    }

    if (!question.options.includes(question.correctAnswer)) {
      return false;
    }
  }

  return true;
}

// ------------------------------------
// Generate quiz using one Gemini model
// ------------------------------------
async function generateWithModel(
  ai,
  modelName,
  prompt,
  numQuestions
) {
  try {
    console.log(`Trying Gemini model: ${modelName}`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;

    if (!responseText) {
      throw new Error("Gemini returned an empty response");
    }

    let quizData;

    try {
      quizData = JSON.parse(responseText);
    } catch (error) {
      console.error(`Invalid JSON from ${modelName}`);
      throw new Error("Invalid Gemini JSON response");
    }

    if (!validateQuizData(quizData, numQuestions)) {
      console.error(`Quiz validation failed for ${modelName}`);

      throw new Error(
        `Gemini did not return exactly ${numQuestions} valid questions`
      );
    }

    console.log(
      `Quiz generated successfully using ${modelName}`
    );

    return quizData;
  } catch (error) {
    console.error(
      `${modelName} failed:`,
      error.message
    );

    throw error;
  }
}

// ------------------------------------
// Generate quiz from transcript
// ------------------------------------
async function generateQuizFromTranscript(
  transcript,
  numQuestions = 5
) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");

      return {
        success: false,
        code: "GEMINI_FAILURE",
        message:
          "We couldn't generate the quiz right now. Please try again in a moment.",
      };
    }

    if (!transcript || typeof transcript !== "string") {
      return {
        success: false,
        code: "EMPTY_TRANSCRIPT",
        message:
          "We couldn't find enough content to generate a quiz from this video. Please try another video.",
      };
    }

    // ------------------------------------
    // Limit transcript size
    // ------------------------------------
    const words = transcript.trim().split(/\s+/);

    const limitedTranscript = words
      .slice(0, 3000)
      .join(" ");

    if (limitedTranscript.length < 50) {
      return {
        success: false,
        code: "EMPTY_TRANSCRIPT",
        message:
          "We couldn't find enough content to generate a quiz from this video. Please try another video.",
      };
    }

    // ------------------------------------
    // Initialize Gemini
    // ------------------------------------
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // ------------------------------------
    // Quiz generation prompt
    // ------------------------------------
    const prompt = `
You are an educational quiz generator.

Analyze the following YouTube educational video transcript.

Create:

1. A concise summary of the transcript.
2. Exactly ${numQuestions} multiple-choice questions.
3. Each question must have exactly 4 options.
4. Each question must have exactly one correct answer.
5. The correctAnswer must exactly match one of the options.
6. Questions must be based only on the information present in the transcript.
7. Do not repeat questions.

Return ONLY valid JSON.

Do not use markdown.
Do not use code fences.
Do not add any explanation outside the JSON.

Required JSON format:

{
  "summary": "A concise summary of the video",
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Option A"
    }
  ]
}

Transcript:

${limitedTranscript}
`;

    // ------------------------------------
    // Gemini models to try
    // ------------------------------------
    const models = [
      process.env.GEMINI_MODEL || "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
    ];

    // Remove duplicate model names
    const uniqueModels = [...new Set(models)];

    // ------------------------------------
    // Try models one by one
    // ------------------------------------
    for (const modelName of uniqueModels) {
      try {
        const quizData = await generateWithModel(
          ai,
          modelName,
          prompt,
          numQuestions
        );

        return {
          success: true,
          data: quizData,
        };
      } catch (error) {
        console.log(
          `Moving to next Gemini model after ${modelName} failure...`
        );
      }
    }

    // ------------------------------------
    // All models failed
    // ------------------------------------
    console.error("All Gemini models failed");

    return {
      success: false,
      code: "GEMINI_FAILURE",
      message:
        "We couldn't generate the quiz right now. Please try again in a moment.",
    };
  } catch (error) {
    console.error("Gemini error:", error);

    return {
      success: false,
      code: "GEMINI_FAILURE",
      message:
        "We couldn't generate the quiz right now. Please try again in a moment.",
    };
  }
}

module.exports = {
  generateQuizFromTranscript,
  validateQuizData,
};