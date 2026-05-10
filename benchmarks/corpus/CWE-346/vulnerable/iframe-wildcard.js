// CWE-346: postMessage with wildcard origin
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — '*' lets any window receive the message
function notifyChild(iframe, payload) {
  iframe.contentWindow.postMessage(payload, '*');
}
