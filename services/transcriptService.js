const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Decodes basic HTML entities commonly found in YouTube transcript text.
 * @param {string} text 
 * @returns {string}
 */
const decodeHtmlEntities = (text) => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Fetches and processes YouTube transcript by Video ID.
 * Never throws an unhandled error; returns a structured result.
 * 
 * @param {string} videoId 
 * @returns {Promise<{ success: boolean, transcript?: string, wordCount?: number, code?: string, message?: string }>}
 */
const getTranscript = async (videoId) => {
  try {
    if (!videoId) {
      return {
        success: false,
        code: 'INVALID_VIDEO_ID',
        message: 'Please enter a valid YouTube video URL.'
      };
    }

    // Attempt to fetch captions
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      return {
        success: false,
        code: 'EMPTY_TRANSCRIPT',
        message: "We couldn't find enough content to generate a quiz from this video. Please try another video."
      };
    }

    // Combine caption segments into a single cohesive text
    const fullText = transcriptItems
      .map((item) => decodeHtmlEntities(item.text))
      .join(' ');

    const words = fullText.split(/\s+/).filter(Boolean);

    // Ensure there is sufficient educational content (minimum 50 words)
    if (words.length < 50) {
      return {
        success: false,
        code: 'EMPTY_TRANSCRIPT',
        message: "We couldn't find enough content to generate a quiz from this video. Please try another video."
      };
    }

    return {
      success: true,
      transcript: fullText,
      wordCount: words.length
    };
  } catch (error) {
    // Log technical error internally for developer debugging
    console.error(`[TranscriptService] Unable to fetch transcript for video "${videoId}":`, error.message);

    // Return safe, user-friendly response as per project requirements
    return {
      success: false,
      code: 'TRANSCRIPT_UNAVAILABLE',
      message: "We couldn't access a transcript for this video. Please try another video."
    };
  }
};

module.exports = {
  getTranscript,
  decodeHtmlEntities
};

