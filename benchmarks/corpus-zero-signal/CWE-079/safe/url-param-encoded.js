// CWE-079: same value passed through encodeURIComponent
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of url-param-unescaped.js
function search(req) {
  return `https://example.com?q=${encodeURIComponent(req.query.q)}`;
}
