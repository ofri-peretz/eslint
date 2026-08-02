// CWE-798: Hardcoded Credentials — JWT signing secret and a baked-in token
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — a committed HS256 secret lets anyone mint valid admin tokens
const JWT_SECRET = 's3cr3t-signing-key-9f2b1c8d4a6e';
const SERVICE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdmMtYmlsbGluZyIsInJvbGUiOiJhZG1pbiJ9.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';

function signSession(jwt, userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

function callBilling() {
  return fetch('https://billing.internal/api/v1/charges', {
    headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
  });
}
