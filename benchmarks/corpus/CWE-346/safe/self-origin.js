// CWE-346: safe — self origin
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — uses current document's origin
function reportStatus(status) {
  window.parent.postMessage({ status }, location.origin);
}
