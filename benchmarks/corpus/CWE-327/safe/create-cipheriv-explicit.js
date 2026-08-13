// CWE-327: crypto.createCipheriv with an explicit key and IV
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of create-cipher-deprecated.js
const crypto = require('crypto');
const c = crypto.createCipheriv('aes-256-cbc', key, iv);
