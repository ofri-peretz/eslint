// CWE-327: crypto.createCipher — no IV, key derived by MD5
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by node-security/no-deprecated-cipher-method
const crypto = require('crypto');
const c = crypto.createCipher('aes-256-cbc', password);
