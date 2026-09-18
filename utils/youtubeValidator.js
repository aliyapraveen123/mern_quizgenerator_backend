/**
 * Extracts the 11-character YouTube Video ID from various URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 *
 * @param {string} url - The YouTube URL provided by the user
 * @returns {string|null} - The extracted videoId or null if invalid
 */
const extractVideoId = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  // Regex matching all common YouTube URL formats
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  const match = trimmedUrl.match(youtubeRegex);

  return match ? match[1] : null;
};

/**
 * Validates a YouTube URL and returns a structured validation response.
 *
 * @param {string} url - The URL string to validate
 * @returns {{ isValid: boolean, videoId: string|null, message?: string }}
 */
const validateYouTubeUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return {
      isValid: false,
      videoId: null,
      message: 'Please enter a valid YouTube video URL.'
    };
  }

  const videoId = extractVideoId(url);

  if (!videoId) {
    return {
      isValid: false,
      videoId: null,
      message: 'Please enter a valid YouTube video URL.'
    };
  }

  return {
    isValid: true,
    videoId: videoId
  };
};

module.exports = {
  extractVideoId,
  validateYouTubeUrl
};

