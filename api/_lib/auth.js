import { createRemoteJWKSet, jwtVerify } from 'jose';

// Two credential shapes can arrive from the frontend SDK's getJWTToken():
//   1. a real JWT (verify locally against the auth server's JWKS)
//   2. an opaque better-auth session token (ask the auth server via
//      GET <base>/get-session with the session cookie, mirroring Neon's
//      own server SDK)
// The JWKS route table in Neon's SDK maps jwks -> "<base>/jwt"; we also try
// the two conventional fallbacks in case the path changes between releases.
const SESSION_COOKIE = '__Secure-neon-auth.session_token'; // NEON_AUTH_SESSION_COOKIE_NAME in Neon's SDK
let cachedJwks = null;

function authBaseUrl() {
  const base = process.env.NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL || '';
  return base.replace(/\/+$/, '');
}

function jwksCandidates(base) {
  return [`${base}/jwt`, `${base}/jwks`, `${base}/.well-known/jwks.json`];
}

function looksLikeJwt(token) {
  return token.split('.').length === 3;
}

// Pin to asymmetric signature algorithms. Without this a token could name
// its own algorithm, which is the classic JWT confusion attack.
const JWT_OPTS = { algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'EdDSA'] };

async function verifyJwt(token, base) {
  if (cachedJwks) {
    const { payload } = await jwtVerify(token, cachedJwks, JWT_OPTS);
    return payload;
  }
  let lastErr = null;
  for (const url of jwksCandidates(base)) {
    const jwks = createRemoteJWKSet(new URL(url));
    try {
      const { payload } = await jwtVerify(token, jwks, JWT_OPTS);
      cachedJwks = jwks;
      return payload;
    } catch (e) {
      lastErr = e;
      // JWKS fetch failure → try next candidate; a signature failure will
      // fail on every candidate and surface below, which is correct.
    }
  }
  throw lastErr || new Error('Unable to verify token against any JWKS endpoint');
}

async function verifySessionToken(token, base) {
  const r = await fetch(`${base}/get-session`, {
    headers: { Cookie: `${SESSION_COOKIE}=${token}` },
    signal: AbortSignal.timeout(4000),
  });
  if (!r.ok) throw new Error(`get-session responded ${r.status}`);
  const body = await r.json();
  const id = body?.user?.id || body?.data?.user?.id || null;
  if (!id) throw new Error('get-session returned no user');
  return id;
}

// Returns the authenticated user id or null when the request carries no
// usable credentials. Throws on configuration errors.
export async function getUserId(req) {
  const authz = req.headers['authorization'] || '';
  if (!authz.startsWith('Bearer ')) return null;
  const token = authz.slice(7).trim();
  if (!token || token === 'null' || token === 'undefined') return null;
  const base = authBaseUrl();
  if (!base) throw new Error('NEON_AUTH_URL env var is not configured');

  if (looksLikeJwt(token)) {
    try {
      const payload = await verifyJwt(token, base);
      if (typeof payload.sub === 'string' && payload.sub) return payload.sub;
    } catch (e) {
      console.warn('auth: JWT verification failed, falling back to get-session:', e.message);
    }
  }

  try {
    return await verifySessionToken(token, base);
  } catch (e) {
    console.warn('auth: session token verification failed:', e.message);
    return null;
  }
}
