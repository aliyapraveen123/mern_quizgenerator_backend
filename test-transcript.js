const { getTranscript } = require('./services/transcriptService');

async function runTests() {
  console.log('🧪 Running Transcript Extraction Tests:\n');

  // Test 1: Video with captions (Sample YouTube Developers demo: M7lc1UVf-VE)
  console.log('--- Test 1: Video WITH Captions (M7lc1UVf-VE) ---');
  const res1 = await getTranscript('M7lc1UVf-VE');
  if (res1.success) {
    console.log(`✅ Success! Extracted ${res1.wordCount} words.`);
    console.log(`Sample preview: "${res1.transcript.slice(0, 100)}..."\n`);
  } else {
    console.log(`❌ Failed: ${res1.message}\n`);
  }

  // Test 2: Video without captions or invalid ID (graceful error handling)
  console.log('--- Test 2: Video WITHOUT Captions / Invalid ID ---');
  const res2 = await getTranscript('invalid_id_999');
  if (!res2.success && res2.code === 'TRANSCRIPT_UNAVAILABLE') {
    console.log(`✅ Gracefully Handled! Code: ${res2.code}`);
    console.log(`User-friendly Message: "${res2.message}"\n`);
  } else {
    console.log('❌ Failed: Did not return expected friendly error.\n');
  }

  console.log('🎉 Transcript service tests completed.');
}

runTests();

