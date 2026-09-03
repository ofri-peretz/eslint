// CWE-916: PBKDF2 at 600,000 iterations (OWASP 2023 floor for SHA-256)
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of pbkdf2-1000-iterations.js
const crypto = require('crypto');
crypto.pbkdf2(password, salt, 600000, 32, 'sha256', callback);
