// CWE-020: Origin check with an unanchored regular expression
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — without ^…$ the pattern matches anywhere, so "https://app.example.com.evil.io" is accepted
const ALLOWED_ORIGIN = /https:\/\/app\.example\.com/;

window.addEventListener('message', (event) => {
  if (!ALLOWED_ORIGIN.test(event.origin)) {
    return;
  }
  applySettings(event.data);
});
