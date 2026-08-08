import { createRemoteJWKSet, jwtVerify } from 'jose';

// The Neon Auth server publishes its JWKS. The route table in Neon's own SDK
// maps jwks -> "<base>/jwt"; we also try the two conventional fallbacks in
// case the path changes between releases. The first candidate that verifies
// a token is cached for the life of the function instance.
let cachedJwks = null;

function authBaseUrl() {
  const base = process.env.NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL || '';
  return base.replace(/\/+$/, '');
}

function jwksCandidates(base) {
  return [`${base}/jwt`, `${base}/jwks`, `${base}/.well-known/jwks.json`];
}

async function verifyToken(token) {
  const base = authBaseUrl();
  if (cachedJwks) {
    const { payload } = await jwtVerify(token, cachedJwks);
    return payload;
  }

  let lastErr = null;
  for (const url of jwksCandidates(base)) {
    const jwks = createRemoteJWKSet(new URL(url));
    try {
      const { payload } = await jwtVerify(token, jwks);
      cachedJwks = jwks;
      return payload;
    } catch (e) {
      lastErr = e;
      // JWKSError / fetch failure → try next candidate; a signature failure
      // will fail on every candidate and surface below, which is correct.
    }
  }
  throw lastErr || new Error('Unable to verify token against any JWKS endpoint');
}

// Returns the authenticated user id (JWT `sub`) or null when the request
// carries no usable credentials. Throws on configuration errors.
export async function getUserId(req) {
  const authz = req.headers['authorization'] || '';
  if (!authz.startsWith('Bearer ')) return null;
  const token = authz.slice(7).trim();
  if (!token) return null;
  if (!authBaseUrl()) throw new Error('NEON_AUTH_URL env var is not configured');
  try {
    const payload = await verifyToken(token);
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch (e) {
    console.warn('auth: token verification failed:', e.message);
    return null;
  }
}
