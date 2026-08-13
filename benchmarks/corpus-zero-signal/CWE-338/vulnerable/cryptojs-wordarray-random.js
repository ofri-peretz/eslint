// CWE-338: CryptoJS.lib.WordArray.random for security material
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by node-security/no-cryptojs-weak-random
const iv = CryptoJS.lib.WordArray.random(16);
