// Public runtime config for the static frontend. Only ever expose values
// that are safe to ship to the browser (the auth URL is public by nature).
// db/authConfigured are boolean diagnostics only — no secrets.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const authUrl = process.env.NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL || null;
  res.status(200).json({
    authUrl,
    db: Boolean(process.env.DATABASE_URL),
  });
}
