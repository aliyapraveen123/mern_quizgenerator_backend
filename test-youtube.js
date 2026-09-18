const { validateYouTubeUrl } = require('./utils/youtubeValidator');

const testCases = [
  { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
  { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
  { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', expected: 'dQw4w9WgXcQ' },
  { url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
  { url: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
  { url: 'https://example.com/video', expected: null },
  { url: 'not-a-url', expected: null },
  { url: '', expected: null }
];

console.log('🧪 Running YouTube URL Validation Tests:\n');
let passed = 0;

testCases.forEach((test, index) => {
  const result = validateYouTubeUrl(test.url);
  const success = result.isValid ? result.videoId === test.expected : test.expected === null;

  if (success) {
    console.log(`✅ Test #${index + 1} PASSED: "${test.url}" -> ${result.videoId || 'REJECTED'}`);
    passed++;
  } else {
    console.log(`❌ Test #${index + 1} FAILED: "${test.url}"`);
  }
});

console.log(`\nResults: ${passed}/${testCases.length} tests passed!`);

