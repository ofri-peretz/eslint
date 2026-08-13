// CWE-521: credentials sent in an Authorization header
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of credentials-in-url.js
const url = 'https://example.com';
const headers = { Authorization: 'Bearer ' + token };
