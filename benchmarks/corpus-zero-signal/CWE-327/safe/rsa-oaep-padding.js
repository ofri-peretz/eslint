// CWE-327: RSA decryption with OAEP padding
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of rsa-pkcs1-padding.js
const crypto = require('crypto');
crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);
