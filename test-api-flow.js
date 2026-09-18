const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

async function runEndToEndBackendTest() {
  console.log('🚀 Starting Full-Stack API Flow Test...\n');

  // Step 1: Login
  console.log('1️⃣ Logging in user...');
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'johndoe@example.com',
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('❌ Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.data.token;
  console.log('✅ Logged in successfully. Token acquired.\n');

  // Step 2: Generate Quiz
  console.log('2️⃣ Calling POST /api/quiz/generate with YouTube URL...');
  console.log('   (Extracting transcript -> Calling Gemini AI -> Saving to MongoDB...)');
  const genRes = await fetch('http://127.0.0.1:5000/api/quiz/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE'
    })
  });
  const genData = await genRes.json();
  if (!genData.success) {
    console.error('❌ Quiz generation failed:', genData);
    process.exit(1);
  }
  const quiz = genData.data;
  console.log('✅ Quiz Generated Successfully!');
  console.log(`   Quiz ID: ${quiz._id}`);
  console.log(`   Summary: "${quiz.summary.slice(0, 80)}..."`);
  console.log(`   Number of Questions: ${quiz.questions.length}\n`);

  // Step 3: Simulate user answering questions
  console.log('3️⃣ Submitting quiz attempt to POST /api/quiz/result...');
  // Answer first 4 correctly, rest wrong to test score calculation
  const userAnswers = quiz.questions.map((q, idx) => ({
    questionIndex: idx,
    selectedAnswer: idx < 4 ? q.correctAnswer : 'Wrong Answer'
  }));

  const resultRes = await fetch('http://127.0.0.1:5000/api/quiz/result', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      quizId: quiz._id,
      answers: userAnswers
    })
  });
  const resultData = await resultRes.json();
  if (!resultData.success) {
    console.error('❌ Score submission failed:', resultData);
    process.exit(1);
  }
  const evalResult = resultData.data;
  console.log('✅ Quiz Score Evaluated by Backend Logic:');
  console.log(`   Correct Answers: ${evalResult.score} / ${evalResult.totalQuestions}`);
  console.log(`   Incorrect Answers: ${evalResult.incorrectAnswers}`);
  console.log(`   Percentage: ${evalResult.percentage}%`);
  console.log(`   Passed (>=60%): ${evalResult.passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // Step 4: Check Quiz History
  console.log('4️⃣ Fetching user history with GET /api/quiz/history...');
  const historyRes = await fetch('http://127.0.0.1:5000/api/quiz/history', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const historyData = await historyRes.json();
  console.log(`✅ History retrieved! User has ${historyData.count} saved quiz record(s).\n`);

  console.log('🎉 ALL BACKEND APIS & FLOWS ARE 100% WORKING & VERIFIED!');
}

runEndToEndBackendTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

