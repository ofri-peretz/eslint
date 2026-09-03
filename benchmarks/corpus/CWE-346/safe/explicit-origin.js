// CWE-346: safe — explicit origin
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — explicit https origin
function notifyChild(iframe, payload) {
  iframe.contentWindow.postMessage(payload, 'https://app.example.com');
}
