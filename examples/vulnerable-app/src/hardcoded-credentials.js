// FLAGSHIP: secure-coding/no-hardcoded-credentials · CWE-798
// Literal credentials embedded in source. Universally bad — they leak via
// commit history, code-search engines, container images, error logs.

const ADMIN_PASSWORD = 'admin123';                         // ❌ literal password
const STRIPE_SECRET = 'my_api_key_12345_example';  // ❌ literal API key
const DATABASE_URL = 'postgres://app:p4ssw0rd@db.prod:5432/app';  // ❌ literal DSN with creds

export async function authenticate(user, supplied) {
  if (user === 'admin' && supplied === ADMIN_PASSWORD) return true;
  return false;
}

export function chargeCard(token) {
  // Pretend stripe call.
  return { ok: true, key: STRIPE_SECRET };
}

// ✅ Safe equivalent:
//   const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
//   if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD env var is required');
