// CWE-346: postMessage with wildcard origin to parent window
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — sending sensitive data with '*' targetOrigin leaks to any embedder
function reportStatus(status) {
  window.parent.postMessage({ status, sessionId: getSession() }, '*');
}
