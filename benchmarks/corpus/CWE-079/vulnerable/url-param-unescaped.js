// CWE-079: request value interpolated into a URL without encoding
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by browser-security/no-unescaped-url-parameter
function search(req) {
  return `https://example.com?q=${req.query.q}`;
}
