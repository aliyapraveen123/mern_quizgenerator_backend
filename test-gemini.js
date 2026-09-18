const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { generateQuizFromTranscript } = require('./services/aiService');

// Sample short transcript about Photosynthesis for testing
const sampleTranscript = `
Photosynthesis is the biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy.
During this process, plants absorb sunlight using a green pigment called chlorophyll located in chloroplasts.
They take in carbon dioxide from the air and water from the soil.
Through chemical reactions powered by sunlight, carbon dioxide and water are converted into glucose (sugar) and oxygen.
The overall chemical equation is: 6CO2 + 6H2O + light -> C6H12O6 + 6O2.
Glucose provides energy and structural building blocks for the plant, while oxygen is released into the atmosphere as a byproduct, supporting aerobic life on Earth.
Light-dependent reactions take place in the thylakoid membranes, whereas the Calvin cycle (light-independent reactions) occurs in the stroma.
`;

async function testGemini() {
  console.log('🤖 Testing Gemini AI Quiz Generation...\n');
  const result = await generateQuizFromTranscript(sampleTranscript);

  if (result.success) {
    console.log('✅ Gemini Generation SUCCESSFUL!\n');
    console.log(`📝 Summary: "${result.data.summary}"\n`);
    console.log(`❓ Generated ${result.data.questions.length} questions:`);
    result.data.questions.forEach((q, i) => {
      console.log(`\nQ${i + 1}: ${q.question}`);
      q.options.forEach((opt, idx) => {
        const marker = opt === q.correctAnswer ? '✓' : ' ';
        console.log(`   [${String.fromCharCode(65 + idx)}] ${opt} ${marker}`);
      });
      console.log(`   Correct Answer: ${q.correctAnswer}`);
    });
  } else {
    console.log(`⚠️ Status Code: ${result.code}`);
    console.log(`Message: ${result.message}`);
    if (result.code === 'API_KEY_MISSING') {
      console.log('\n💡 Please add your Gemini API key to server/.env:');
      console.log('   GEMINI_API_KEY=AIzaSy...');
    }
  }
}

testGemini();

