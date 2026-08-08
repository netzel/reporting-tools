// Public runtime config for the static frontend. Only ever expose values
// that are safe to ship to the browser (the auth URL is public by nature).
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    authUrl: process.env.NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL || null,
  });
}
