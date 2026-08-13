// CWE-338: crypto.randomBytes from the platform CSPRNG
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of cryptojs-wordarray-random.js
const crypto = require('crypto');
const iv = crypto.randomBytes(16);
