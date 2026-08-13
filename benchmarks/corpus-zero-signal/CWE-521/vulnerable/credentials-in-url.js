// CWE-521: basic-auth credentials embedded in a URL literal
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by browser-security/no-password-in-url
const url = 'https://user:password@example.com';
