// CWE-327: RSA decryption with PKCS#1 v1.5 padding (Bleichenbacher)
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by node-security/no-insecure-rsa-padding
const crypto = require('crypto');
crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);
