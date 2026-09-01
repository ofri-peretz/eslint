// CWE-526: vulnerable — a real credential written into the environment
// @author        ofri-peretz
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-26
// @detects       node-security/require-secure-credential-storage
// This MUST be flagged
//
// The counterpart to env-config-about-a-credential.js: same rule, same shape of
// name, but the value IS the secret. process.env is inherited by every child
// process, readable at /proc/<pid>/environ, and captured by crash dumps.
process.env.API_TOKEN = 'sk-live-abc123';
process.env.CLIENT_SECRET = 'shh-do-not-tell';
process.env.DB_PASSWORD = 'hunter2';
