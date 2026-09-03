// CWE-916: PBKDF2 at 1,000 iterations — far below any current floor
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by node-security/no-insecure-key-derivation
const crypto = require('crypto');
crypto.pbkdf2(password, salt, 1000, 32, 'sha256', callback);
