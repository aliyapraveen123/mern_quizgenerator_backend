// Simple CSRF protection middleware
// Strategy: For state-changing requests (POST/PUT/DELETE/PATCH), verify Origin or Referer header matches the allowed client origin.
// If the request includes an X-CSRF-Token header, allow it as well (double-submit pattern could be added later).

const url = require('url');

const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isSameOrigin(reqOrigin) {
  try {
    if (!reqOrigin) return false;
    const parsed = new url.URL(reqOrigin);
    return CLIENT_ORIGINS.some((origin) => parsed.origin === new url.URL(origin).origin);
  } catch (e) {
    return false;
  }
}

const csrfProtection = (req, res, next) => {
  // Only enforce for non-GET, non-HEAD, non-OPTIONS
  const method = req.method && req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Allow if X-CSRF-Token present and matches a prior pattern — for now we accept it as valid when present (upgradeable).
  if (req.headers['x-csrf-token']) return next();

  if (isSameOrigin(origin) || isSameOrigin(referer)) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Potential CSRF detected' });
};

module.exports = csrfProtection;
