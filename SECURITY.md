# Security notes

How this app protects saved chart data, and what it deliberately does not do.

## Data isolation

Charts are keyed on `(user_id, id)`. Every query in `api/charts.js` is scoped
`where user_id = $1`, and that user id comes **only** from a verified auth
token — never from a request parameter, body field, or cookie the caller
controls. There is no request shape that returns another account's charts.

## Authentication

Sign-in is handled by Neon Auth (email one-time code or Google). The app
stores no passwords. API requests carry a bearer token which the server
verifies either against the auth server's published signing keys (JWTs,
pinned to asymmetric algorithms) or by asking the auth server directly
(opaque session tokens). Because auth travels in a header rather than a
cookie, the API is not reachable via cross-site request forgery.

## Untrusted chart state

Chart files can be exported, shared, and imported, so any loaded state is
treated as hostile input. `sanitizeState()` in `index.html` is the single
chokepoint every load path passes through (JSON import, cloud load, local
load). It coerces every field to a known shape: colors must be literal hex,
ids and values must be numeric, row types must be one of four known strings,
text is length-capped, and unknown fields are dropped. Rendering code escapes
on top of that, and chart ids are attached as event listeners rather than
interpolated into inline handlers.

## Server-side limits

- Chart ids must match `^[A-Za-z0-9_-]{1,100}$`
- Thumbnails must be base64 `data:image/(png|jpeg|webp)` URLs
- Chart state capped at 1 MB, thumbnails at 300 KB, names at 200 characters
- Maximum 300 charts per account

## Response headers

`vercel.json` sets `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`, and a Content-Security-Policy that
blocks external scripts, framing, plugins, and form posts. Note the CSP must
allow `'unsafe-inline'` for scripts because the UI uses inline event
handlers, so it is a second layer of defense rather than the primary one —
input sanitization is the primary defense.

## Known limitations

- Chart contents are stored unencrypted at the application level (the
  database provider encrypts at rest). Anyone with database or hosting
  account access can read chart data, so account security on Vercel, Neon,
  and GitHub — 2FA in particular — is the most important control.
- There is no rate limiting on the API beyond the per-account chart cap.
- There is no audit log of chart access.

## Reporting

Open a GitHub issue, or contact the repository owner directly for anything
sensitive.
